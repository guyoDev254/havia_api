import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Serve static files from uploads directory
  const uploadPath = process.env.UPLOAD_PATH || './uploads';
  
  // Ensure upload directory exists
  const fs = require('fs');
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  
  // Create subdirectories
  const subdirs = ['profile-images', 'images', 'files', 'resources', 'club-logos', 'club-banners'];
  subdirs.forEach((dir) => {
    const dirPath = join(uploadPath, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
  
  // Serve static files - allow access to all subdirectories
  app.useStaticAssets(join(process.cwd(), uploadPath), {
    prefix: '/uploads/',
    setHeaders: (res, path) => {
      // Set proper CORS headers for uploaded files
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    },
  });

  // Enable CORS
  const allowedOrigins = [
    process.env.CORS_ORIGIN || 'http://localhost:19006',
    'http://localhost:3001', // Admin frontend
    'http://localhost:3000', // Alternative admin port
    'http://127.0.0.1:19006', // Expo alternative
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3000',
    'https://northernbox.co.ke',
    'https://www.northernbox.co.ke',
    'https://api.northernbox.co.ke'
  ];
  
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      // In development, allow all localhost and local network IPs
      if (isDevelopment) {
        // Allow localhost
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          return callback(null, true);
        }
        // Allow local network IPs (192.168.x.x, 10.0.x.x, 172.16-31.x.x)
        const localNetworkRegex = /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)/;
        if (localNetworkRegex.test(origin)) {
          return callback(null, true);
        }
      }
      
      // Check against allowed origins
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Type'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Havia API')
    .setDescription('NorthernBox Havia App Backend API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 8000;
  // Listen on all interfaces (0.0.0.0) to allow network access from mobile devices
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Havia API is running on: http://localhost:${port}`);
  console.log(`🌐 Network access: http://0.0.0.0:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api`);
}

bootstrap().catch(console.error);

