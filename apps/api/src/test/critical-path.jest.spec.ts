/**
 * Priority-1 integration test — the critical business path.
 *
 * Boots the REAL Nest application (real controllers, DTO validation, JWT auth,
 * passport strategy, ClientUserGuard workspace resolution, global pipes) and
 * drives the core journey over HTTP with supertest:
 *
 *   login → command-center → research (competitor analysis grounded)
 *         → AI copy generation → viral ideas → lead pipeline update (won + value)
 *         → intelligence (revenue/attribution) → analytics
 *
 * PrismaService is replaced with a controllable in-memory fake so the test runs
 * anywhere (no live DB), while everything else is the production wiring. AI is
 * forced into its mock/rule-based fallback (no external calls, no cost).
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { GlobalExceptionFilter } from '../common/filters/http-exception.filter';
import { createFakePrisma, FakePrisma } from './fake-prisma';

// Required config so ConfigService-backed secrets exist during the test.
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'test-access-secret-that-is-long-enough-000';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-that-is-long-enough-0';
process.env.NODE_ENV = 'test';

const WORKSPACE_ID = 'ws-test-1';
const USER_ID = 'user-test-1';
const EMAIL = 'owner@test.com';
const PASSWORD = 'password123';

describe('Critical business path (integration)', () => {
  let app: INestApplication;
  let fake: FakePrisma;
  let token: string;

  beforeAll(async () => {
    fake = createFakePrisma();

    // Seed one workspace + one ADMIN user with a real bcrypt hash so the real
    // login path (bcrypt.compare + JWT sign) executes end-to-end.
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    fake.seed({
      workspaces: [
        { id: WORKSPACE_ID, name: 'Test Salon', slug: 'test-salon', status: 'ACTIVE' },
      ],
      users: [
        {
          id: USER_ID,
          email: EMAIL,
          passwordHash,
          name: 'Test Owner',
          role: 'ADMIN',
          workspaceId: WORKSPACE_ID,
        },
      ],
      businessProfiles: [
        { workspaceId: WORKSPACE_ID, industry: 'Salons', location: 'Mumbai' },
      ],
    });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(fake.client)
      // Force AI into fallback mode (no client) so no external calls happen.
      .overrideProvider(AiService)
      .useValue({
        getClient: () => null,
        getChatModel: () => 'test-model',
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  const auth = () => ({ Authorization: `Bearer ${token}`, 'X-Workspace-Id': WORKSPACE_ID });

  it('1. rejects bad credentials (real bcrypt + DTO validation)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: EMAIL, password: 'wrong-password' })
      .expect(401);
  });

  it('1b. rejects malformed login body (DTO whitelist)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'x' })
      .expect(400);
  });

  it('2. logs in and returns an access token + client portal user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: EMAIL, password: PASSWORD })
      .expect(201);

    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user).toMatchObject({
      email: EMAIL,
      role: 'ADMIN',
      workspaceId: WORKSPACE_ID,
      portal: 'client',
    });
    token = res.body.accessToken;
  });

  it('3. blocks protected routes without a token (JWT guard)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/dashboard/command-center')
      .expect(401);
  });

  it('4. command-center returns KPIs + actions for the workspace', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboard/command-center')
      .set(auth())
      .expect(200);

    expect(res.body).toHaveProperty('kpis');
    expect(res.body).toHaveProperty('actions');
    expect(res.body).toHaveProperty('pipeline');
  });

  it('5. research generates a report grounded in competitor analysis', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/content/research')
      .set(auth())
      .send({ topic: 'luxury salon services', niche: 'Salons' })
      .expect(201);

    expect(Array.isArray(res.body.competitors)).toBe(true);
    expect(Array.isArray(res.body.viralHooks)).toBe(true);
    expect(Array.isArray(res.body.trends)).toBe(true);
  });

  it('6. AI copy generation returns content (mock fallback)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/content/studio/generate')
      .set(auth())
      .send({ type: 'caption', topic: 'weekend hair spa offer', tone: 'Hinglish-Casual', language: 'Hinglish' })
      .expect(201);

    expect(typeof res.body.content).toBe('string');
    expect(res.body.content.length).toBeGreaterThan(0);
  });

  it('7. viral ideas generation returns idea cards (mock fallback)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/content/ideas/generate')
      .set(auth())
      .send({ niche: 'Salons' })
      .expect(201);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('8. lead pipeline: closing a lead records revenue attribution (wonAt + value)', async () => {
    // Seed a contact + lead to move through the pipeline.
    fake.seed({
      contacts: [
        { id: 'contact-1', workspaceId: WORKSPACE_ID, phone: '+919812345678', name: 'Riya', leadSource: 'whatsapp' },
      ],
      leads: [
        { id: 'lead-1', workspaceId: WORKSPACE_ID, contactId: 'contact-1', status: 'INTERESTED' },
      ],
    });

    const res = await request(app.getHttpServer())
      .patch('/api/v1/leads/lead-1')
      .set(auth())
      .send({ status: 'CLOSED', value: 5000 })
      .expect(200);

    expect(res.body.status).toBe('CLOSED');
    expect(res.body.value).toBe(5000);
    expect(res.body.wonAt).toBeTruthy();
  });

  it('9. intelligence reflects the won lead in revenue', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboard/intelligence')
      .set(auth())
      .expect(200);

    expect(res.body.economics.revenue).toBe(5000);
    expect(res.body.economics.customers).toBe(1);
    // No connected ad account in the test → honest zero ROAS, not fabricated.
    expect(res.body.economics.adsConnected).toBe(false);
  });

  it('10. cross-workspace access is denied (tenant isolation)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/dashboard/command-center')
      .set({ Authorization: `Bearer ${token}`, 'X-Workspace-Id': 'someone-elses-workspace' })
      .expect(403);
  });
});
