import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // The web application is served by Nest from the same Render service.
  // Prevent browsers and intermediary caches from keeping an obsolete bundle
  // after a deployment. Vite assets are rebuilt with hashed names, so forcing
  // revalidation here is safe and ensures index.html always points to the
  // latest JavaScript files.
  app.use((request: { originalUrl?: string; url?: string }, response: { setHeader: (name: string, value: string) => void }, next: () => void) => {
    const url = request.originalUrl ?? request.url ?? '';
    if (!url.startsWith('/api')) {
      response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.setHeader('Pragma', 'no-cache');
      response.setHeader('Expires', '0');
      response.setHeader('Surrogate-Control', 'no-store');
    }
    next();
  });

  app.setGlobalPrefix('api');

  const allowedOrigins = (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
