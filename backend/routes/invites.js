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

    // Controlla se l'utente di destinazione esiste ed è online
    const targetUser = await prisma.$queryRaw`
      SELECT cu.id, cu.firstName, ull.isLive
      FROM caffis_users cu
      LEFT JOIN user_live_locations ull ON cu.id = ull.userId
      WHERE cu.id = ${toUserId}
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
    await redis.setex(
      `invite:${invite.id}`, 
      86400, // 24 ore
      JSON.stringify(invite)
    );

    // Aggiungi alla lista degli inviti in sospeso dell'utente
    await redis.sadd(`user_invites:${toUserId}`, invite.id);

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

// Ottieni inviti ricevuti per un utente
router.get('/received', async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = 'PENDING' } = req.query;

    const invites = await prisma.$queryRaw`
      SELECT 
        mi.*,
        cu.firstName as fromFirstName,
        cu.lastName as fromLastName,
        cu.username as fromUsername,
        cu.profilePic as fromProfilePic
      FROM meetup_invites mi
      JOIN caffis_users cu ON mi.fromUserId = cu.id
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

// Ottieni inviti inviati per un utente
router.get('/sent', async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = 'PENDING' } = req.query;

    const invites = await prisma.$queryRaw`
      SELECT 
        mi.*,
        cu.firstName as toFirstName,
        cu.lastName as toLastName,
        cu.username as toUsername,
        cu.profilePic as toProfilePic
      FROM meetup_invites mi
      JOIN caffis_users cu ON mi.toUserId = cu.id
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
    await redis.setex(
      `invite:${inviteId}`, 
      86400,
      JSON.stringify(updatedInvite)
    );

    // Rimuovi dagli inviti in sospeso se rifiutato
    if (status === 'DECLINED') {
      await redis.srem(`user_invites:${userId}`, inviteId);
    }

    const responseMessage = status === 'ACCEPTED' ? 
      'Invito accettato! Incontro confermato. 🎉' : 
      'Invito rifiutato. 😔';

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

// Annulla un invito inviato
router.delete('/:inviteId/cancel', async (req, res) => {
  try {
    const { inviteId } = req.params;
    const userId = req.user.id;

    const invite = await prisma.meetupInvite.updateMany({
      where: {
        id: inviteId,
        fromUserId: userId,
        status: 'PENDING'
      },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    });

    if (invite.count === 0) {
      return res.status(404).json({ 
        error: 'Invito non trovato o non può essere annullato' 
      });
    }

    // Pulisci la cache
    await redis.del(`invite:${inviteId}`);

    res.json({ 
      success: true, 
      message: 'Invito annullato con successo ❌' 
    });

  } catch (error) {
    console.error('Errore nell\'annullamento dell\'invito:', error);
    res.status(500).json({ error: 'Impossibile annullare l\'invito' });
  }
});

// Ottieni statistiche degli inviti per la dashboard
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(CASE WHEN fromUserId = ${userId} AND status = 'PENDING' THEN 1 END) as inviiInSospeso,
        COUNT(CASE WHEN toUserId = ${userId} AND status = 'PENDING' THEN 1 END) as ricevutiInSospeso,
        COUNT(CASE WHEN (fromUserId = ${userId} OR toUserId = ${userId}) AND status = 'ACCEPTED' THEN 1 END) as accettati,
        COUNT(CASE WHEN fromUserId = ${userId} AND status = 'DECLINED' THEN 1 END) as rifiutati
      FROM meetup_invites
      WHERE (fromUserId = ${userId} OR toUserId = ${userId})
        AND createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `;

    res.json({ 
      success: true, 
      stats: stats[0],
      message: 'Statistiche inviti ultimi 30 giorni'
    });

  } catch (error) {
    console.error('Errore nel recupero delle statistiche:', error);
    res.status(500).json({ error: 'Impossibile recuperare le statistiche' });
  }
});

module.exports = router;