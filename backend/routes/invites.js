const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const redis = require('../config/redis');

const prisma = new PrismaClient();

// Invia un invito per un incontro
router.post('/send', async (req, res) => {
  try {
    const { 
      toUserId, 
      placeId, 
      placeName, 
      placeAddress, 
      message, 
      meetupTime 
    } = req.body;
    const fromUserId = req.user.id;

    // Valida i campi obbligatori
    if (!toUserId || !placeName) {
      return res.status(400).json({ 
        error: 'Utente di destinazione e luogo sono obbligatori' 
      });
    }

    // Controlla se l'utente di destinazione esiste ed è online - FIXED TO USE user_profiles
    const targetUser = await prisma.$queryRaw`
      SELECT up.userId as id, up.firstName, ull.isLive
      FROM user_profiles up
      LEFT JOIN user_live_locations ull ON up.userId = ull.userId
      WHERE up.userId = ${toUserId}
    `;

    if (!targetUser.length) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Crea l'invito
    const invite = await prisma.meetupInvite.create({
      data: {
        fromUserId,
        toUserId,
        placeId,
        placeName,
        placeAddress,
        message,
        meetupTime: meetupTime ? new Date(meetupTime) : null,
        status: 'PENDING'
      }
    });

    // Cache dell'invito per notifiche in tempo reale
    try {
      await redis.setex(
        `invite:${invite.id}`, 
        86400, // 24 ore
        JSON.stringify(invite)
      );

      // Aggiungi alla lista degli inviti in sospeso dell'utente
      await redis.sadd(`user_invites:${toUserId}`, invite.id);
    } catch (cacheError) {
      console.warn('Cache write failed:', cacheError.message);
    }

    res.json({ 
      success: true, 
      invite,
      message: 'Invito inviato con successo! ☕' 
    });

  } catch (error) {
    console.error('Errore nell\'invio dell\'invito:', error);
    res.status(500).json({ error: 'Impossibile inviare l\'invito' });
  }
});

// Ottieni inviti ricevuti per un utente - FIXED TO USE user_profiles
router.get('/received', async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = 'PENDING' } = req.query;

    const invites = await prisma.$queryRaw`
      SELECT 
        mi.*,
        up.firstName as fromFirstName,
        up.lastName as fromLastName,
        up.username as fromUsername,
        up.profilePic as fromProfilePic
      FROM meetup_invites mi
      JOIN user_profiles up ON mi.fromUserId = up.userId
      WHERE mi.toUserId = ${userId}
        AND mi.status = ${status}
      ORDER BY mi.createdAt DESC
      LIMIT 20
    `;

    res.json({ 
      success: true, 
      invites,
      count: invites.length,
      message: `${invites.length} inviti ${status === 'PENDING' ? 'in sospeso' : 'trovati'}`
    });

  } catch (error) {
    console.error('Errore nel recupero degli inviti ricevuti:', error);
    res.status(500).json({ error: 'Impossibile recuperare gli inviti' });
  }
});

// Ottieni inviti inviati per un utente - FIXED TO USE user_profiles
router.get('/sent', async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = 'PENDING' } = req.query;

    const invites = await prisma.$queryRaw`
      SELECT 
        mi.*,
        up.firstName as toFirstName,
        up.lastName as toLastName,
        up.username as toUsername,
        up.profilePic as toProfilePic
      FROM meetup_invites mi
      JOIN user_profiles up ON mi.toUserId = up.userId
      WHERE mi.fromUserId = ${userId}
        AND mi.status = ${status}
      ORDER BY mi.createdAt DESC
      LIMIT 20
    `;

    res.json({ 
      success: true, 
      invites,
      count: invites.length,
      message: `${invites.length} inviti inviati`
    });

  } catch (error) {
    console.error('Errore nel recupero degli inviti inviati:', error);
    res.status(500).json({ error: 'Impossibile recuperare gli inviti inviati' });
  }
});

// Rispondi a un invito (accetta/rifiuta)
router.patch('/:inviteId/respond', async (req, res) => {
  try {
    const { inviteId } = req.params;
    const { status, response_message } = req.body; // 'ACCEPTED' o 'DECLINED'
    const userId = req.user.id;

    // Valida lo status
    if (!['ACCEPTED', 'DECLINED'].includes(status)) {
      return res.status(400).json({ 
        error: 'Lo status deve essere ACCEPTED o DECLINED' 
      });
    }

    // Aggiorna lo status dell'invito
    const invite = await prisma.meetupInvite.updateMany({
      where: {
        id: inviteId,
        toUserId: userId,
        status: 'PENDING'
      },
      data: {
        status,
        updatedAt: new Date()
      }
    });

    if (invite.count === 0) {
      return res.status(404).json({ 
        error: 'Invito non trovato o già gestito' 
      });
    }

    // Ottieni i dettagli dell'invito aggiornato
    const updatedInvite = await prisma.meetupInvite.findUnique({
      where: { id: inviteId }
    });

    // Aggiorna la cache
    try {
      await redis.setex(
        `invite:${inviteId}`, 
        86400,
        JSON.stringify(updatedInvite)
      );

      // Rimuovi dagli inviti in sospeso se rifiutato
      if (status === 'DECLINED') {
        await redis.srem(`user_invites:${userId}`, inviteId);
      }
    } catch (cacheError) {
      console.warn('Cache update failed:', cacheError.message);
    }

    const responseMessage = status === 'ACCEPTED' ? 
      'Invito accettato! Buon caffè! ☕' : 
      'Invito rifiutato';

    res.json({ 
      success: true, 
      invite: updatedInvite,
      message: responseMessage
    });

  } catch (error) {
    console.error('Errore nella risposta all\'invito:', error);
    res.status(500).json({ error: 'Impossibile rispondere all\'invito' });
  }
});

// Cancella un invito (solo da chi l'ha creato)
router.delete('/:inviteId', async (req, res) => {
  try {
    const { inviteId } = req.params;
    const userId = req.user.id;

    // Cancella solo se l'utente è il creatore
    const deletedInvite = await prisma.meetupInvite.deleteMany({
      where: {
        id: inviteId,
        fromUserId: userId,
        status: 'PENDING'
      }
    });

    if (deletedInvite.count === 0) {
      return res.status(404).json({ 
        error: 'Invito non trovato o non puoi cancellarlo' 
      });
    }

    // Rimuovi dalla cache
    try {
      await redis.del(`invite:${inviteId}`);
    } catch (cacheError) {
      console.warn('Cache deletion failed:', cacheError.message);
    }

    res.json({ 
      success: true, 
      message: 'Invito cancellato con successo' 
    });

  } catch (error) {
    console.error('Errore nella cancellazione dell\'invito:', error);
    res.status(500).json({ error: 'Impossibile cancellare l\'invito' });
  }
});

// Ottieni statistiche degli inviti per un utente
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(CASE WHEN fromUserId = ${userId} THEN 1 END) as sent_total,
        COUNT(CASE WHEN toUserId = ${userId} THEN 1 END) as received_total,
        COUNT(CASE WHEN fromUserId = ${userId} AND status = 'PENDING' THEN 1 END) as sent_pending,
        COUNT(CASE WHEN toUserId = ${userId} AND status = 'PENDING' THEN 1 END) as received_pending,
        COUNT(CASE WHEN fromUserId = ${userId} AND status = 'ACCEPTED' THEN 1 END) as sent_accepted,
        COUNT(CASE WHEN toUserId = ${userId} AND status = 'ACCEPTED' THEN 1 END) as received_accepted
      FROM meetup_invites
      WHERE fromUserId = ${userId} OR toUserId = ${userId}
    `;

    res.json({
      success: true,
      stats: stats[0] || {
        sent_total: 0,
        received_total: 0,
        sent_pending: 0,
        received_pending: 0,
        sent_accepted: 0,
        received_accepted: 0
      }
    });

  } catch (error) {
    console.error('Errore nel recupero delle statistiche:', error);
    res.status(500).json({ error: 'Impossibile recuperare le statistiche' });
  }
});

module.exports = router;