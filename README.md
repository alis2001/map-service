# Map Service - Real-time Location-based Coffee & Bar Finder

A real-time location-based map service for finding coffee shops and bars near you, built with modern technologies and fully containerized.

## 🎯 Features

- **Real-time GPS location tracking**
- **Live coffee shop and bar data** from Google Places API
- **Interactive business profiles** with ratings, photos, and details
- **Redis caching** for optimal performance
- **JWT authentication** ready
- **Fully dockerized** and scalable

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express
- PostgreSQL with Prisma ORM
- Redis for caching
- Google Places API
- JWT authentication
- Docker & Docker Compose

**Frontend:** (Coming soon)
- React
- Mapbox GL / Google Maps
- Real-time location services

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+
- Google Places API key

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/YOUR_USERNAME/map-service.git
cd map-service
```

2. **Set up environment variables:**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration
```

3. **Start the services:**
```bash
docker-compose up --build
```

4. **Access the application:**
- Backend API: http://localhost:5001
- Health Check: http://localhost:5001/health
- Database: localhost:5433
- Redis: localhost:6379

## 📁 Project Structure

```
map-service/
├── backend/                 # Express.js backend
│   ├── config/             # Database, Redis, API configs
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Custom middleware
│   ├── models/            # Prisma models
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── utils/             # Utilities
│   ├── prisma/            # Database schema
│   └── Dockerfile
├── frontend/              # React frontend (coming soon)
├── docker-compose.yml     # Docker orchestration
└── README.md
```

## 🗄️ Database Schema

- **Users**: Authentication and user profiles
- **Places**: Coffee shops and bars data
- **UserLocations**: GPS tracking history
- **FavoritePlaces**: User's favorite venues
- **PlaceReviews**: User reviews and ratings

## 🔧 Development

### Backend Development
```bash
cd backend
npm install
npm run dev
```

### Database Operations
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# View database in browser
npm run db:studio
```

### Docker Commands
```bash
# Start all services
docker-compose up

# Rebuild and start
docker-compose up --build

# Stop all services
docker-compose down

# View logs
docker-compose logs -f map-backend
```

## 📊 API Endpoints

### Health & Status
- `GET /health` - Service health check
- `GET /` - API information

### Authentication (Coming soon)
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`

### Location Services (Coming soon)
- `POST /api/v1/location/update`
- `GET /api/v1/location/history`

### Places (Coming soon)
- `GET /api/v1/places/nearby`
- `GET /api/v1/places/:id`
- `POST /api/v1/places/:id/favorite`

## 🌍 Environment Variables

```bash
# Server
NODE_ENV=development
PORT=5001
FRONTEND_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://postgres:admin5026@map-db:5432/map_service

# Redis
REDIS_HOST=map-redis
REDIS_PORT=6379

# APIs
GOOGLE_PLACES_API_KEY=your_api_key_here

# Security
JWT_SECRET=your_jwt_secret
```

## 🚧 Development Status

- [x] Docker containerization
- [x] Database setup with Prisma
- [x] Redis caching configuration
- [x] Express server with middleware
- [x] Logging system
- [ ] Google Places API integration
- [ ] Authentication system
- [ ] Location tracking endpoints
- [ ] Frontend React app
- [ ] Map integration
- [ ] Real-time features

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Projects

- Main Caffis App: Running on ports 3000, 5000, 5432
- Map Service: Running on ports 3001, 5001, 5433

---

**Built with ❤️ for finding the perfect coffee and drinks** ☕🍺