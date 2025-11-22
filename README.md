# Acquisitions Application

A Node.js Express application with Neon Database integration, supporting both development (with Neon Local) and production (with Neon Cloud) environments.

## 🏗️ Architecture

This application uses a dual-database approach:
- **Development**: Neon Local proxy with ephemeral branches
- **Production**: Neon Cloud serverless database

## 📋 Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- Neon Database account
- Git

## 🚀 Quick Start

### Development Environment (Local with Neon Local)

1. **Clone and setup environment**:
   ```bash
   git clone <repository-url>
   cd acquisitions
   cp .env.development .env
   ```

2. **Configure Neon credentials**:
   Edit `.env` file with your Neon credentials:
   ```env
   NEON_API_KEY=your_actual_neon_api_key
   NEON_PROJECT_ID=your_actual_neon_project_id
   PARENT_BRANCH_ID=your_actual_parent_branch_id
   ```

3. **Start development environment**:
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

4. **Access your application**:
   - Application: http://localhost:3000
   - Health check: http://localhost:3000/health
   - Database: localhost:5432 (Neon Local proxy)

### Production Environment

1. **Configure production environment**:
   ```bash
   cp .env.production .env
   ```

2. **Set your Neon Cloud database URL**:
   Edit `.env` file:
   ```env
   DATABASE_URL=postgres://username:password@ep-xxxxx-xxxxx.us-east-1.aws.neon.tech/dbname?sslmode=require
   ```

3. **Deploy to production**:
   ```bash
   # Basic production setup
   docker-compose -f docker-compose.prod.yml up --build -d
   
   # Production with Nginx reverse proxy
   docker-compose -f docker-compose.prod.yml --profile with-nginx up --build -d
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `NODE_ENV` | development | production | Node.js environment |
| `DATABASE_URL` | postgres://neon:npg@neon-local:5432/main | postgres://...neon.tech... | Database connection string |
| `NEON_API_KEY` | Required | Not needed | Neon API key for local development |
| `NEON_PROJECT_ID` | Required | Not needed | Neon project ID |
| `PARENT_BRANCH_ID` | Required | Not needed | Parent branch for ephemeral branches |
| `PORT` | 3000 | 3000 | Application port |
| `LOG_LEVEL` | debug | info | Logging level |

### Database Configuration

The application automatically detects the environment and uses:
- **Neon Local (Development)**: Standard postgres driver with `postgres` package
- **Neon Cloud (Production)**: Neon serverless driver with `@neondatabase/serverless`

## 🛠️ Development Workflow

### Starting Development
```bash
# Start with hot reloading
docker-compose -f docker-compose.dev.yml up

# Rebuild if dependencies change
docker-compose -f docker-compose.dev.yml up --build

# Run in background
docker-compose -f docker-compose.dev.yml up -d
```

### Database Operations
```bash
# Generate migrations
docker-compose -f docker-compose.dev.yml exec app npm run db:generate

# Run migrations
docker-compose -f docker-compose.dev.yml exec app npm run db:migrate

# Open Drizzle Studio
docker-compose -f docker-compose.dev.yml exec app npm run db:studio
```

### Logs and Debugging
```bash
# View application logs
docker-compose -f docker-compose.dev.yml logs app -f

# View Neon Local logs
docker-compose -f docker-compose.dev.yml logs neon-local -f

# Execute commands in container
docker-compose -f docker-compose.dev.yml exec app bash
```

## 🚢 Production Deployment

### Basic Production Deployment
```bash
# Build and start production containers
docker-compose -f docker-compose.prod.yml up --build -d

# Check container status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Production with Nginx
```bash
# Start with Nginx reverse proxy
docker-compose -f docker-compose.prod.yml --profile with-nginx up --build -d

# Access via Nginx
# - HTTP: http://localhost
# - App direct: http://localhost:3000
```

### Health Monitoring
The application includes health checks:
- Endpoint: `/health`
- Docker health checks configured
- Returns: `{"status": "OK", "timestamp": "...", "uptime": "..."}`

## 🗃️ File Structure

```
acquisitions/
├── src/                    # Application source code
│   ├── config/
│   │   └── database.js     # Dual database configuration
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── validations/
│   ├── app.js             # Express application
│   ├── index.js           # Application entry point
│   └── server.js          # Server configuration
├── drizzle/               # Database migrations
├── logs/                  # Application logs
├── Dockerfile             # Multi-stage Docker build
├── docker-compose.dev.yml # Development environment
├── docker-compose.prod.yml# Production environment
├── nginx.conf             # Nginx configuration
├── .env.development       # Development environment variables
├── .env.production        # Production environment variables
└── package.json           # Dependencies and scripts
```

## 🔍 How It Works

### Development Environment
1. **Neon Local Container**: Creates ephemeral database branches
2. **Application Container**: Connects via postgres driver to Neon Local
3. **Hot Reloading**: Source code mounted as volume for development
4. **Fresh Database**: Each container restart creates a new ephemeral branch

### Production Environment
1. **Application Container**: Optimized production build
2. **Direct Connection**: Uses Neon serverless driver to connect to Neon Cloud
3. **Resource Limits**: CPU and memory constraints configured
4. **Health Checks**: Automatic container health monitoring
5. **Optional Nginx**: Reverse proxy with security headers and compression

### Database Driver Selection
The application automatically chooses the database driver:
```javascript
// Detects Neon Local vs Neon Cloud
const isNeonLocal = process.env.DATABASE_URL?.includes('neon-local') || 
                    (process.env.NODE_ENV === 'development' && 
                     !process.env.DATABASE_URL?.includes('neon.tech'));

// Uses appropriate driver
if (isNeonLocal) {
  // Standard postgres driver for Neon Local
} else {
  // Neon serverless driver for production
}
```

## 🛡️ Security Considerations

- Non-root user in production containers
- Environment variable injection (no hardcoded secrets)
- SSL/TLS connections to database
- Nginx security headers in production
- Health check endpoints for monitoring
- Resource limits to prevent abuse

## 🚨 Troubleshooting

### Common Issues

**Neon Local connection fails:**
```bash
# Check Neon Local container logs
docker-compose -f docker-compose.dev.yml logs neon-local

# Verify environment variables
docker-compose -f docker-compose.dev.yml exec app env | grep NEON
```

**Database connection timeout:**
```bash
# Test database connectivity
docker-compose -f docker-compose.dev.yml exec app node -e "
  const { sql } = require('./src/config/database.js');
  sql\`SELECT 1\`.then(() => console.log('✅ Database connected')).catch(console.error);
"
```

**Port conflicts:**
```bash
# Check if ports are in use
netstat -an | grep :3000
netstat -an | grep :5432

# Use different ports in docker-compose files if needed
```

### Environment Variables Not Loading
Ensure your `.env` file is properly configured and contains all required variables. Use `.env.development` as a template.

### Container Health Check Failures
Check the health endpoint directly:
```bash
curl http://localhost:3000/health
```

## 📚 Additional Resources

- [Neon Database Documentation](https://neon.com/docs)
- [Neon Local Documentation](https://neon.com/docs/local/neon-local)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper testing
4. Ensure all containers build and run successfully
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.