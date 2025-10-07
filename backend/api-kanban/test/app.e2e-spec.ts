import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AppModule } from './../src/app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Types, type Connection } from 'mongoose';

describe('Boards, columns and tasks (e2e)', () => {
  let app: INestApplication<App> | null = null;
  let mongo: MongoMemoryServer | null = null;
  let connection: Connection | null = null;
  let mongoAvailable = true;

  beforeAll(async () => {
    process.env.MONGOMS_OS_DISTRO = 'ubuntu1804';
    process.env.MONGOMS_DISTRO = 'ubuntu-18.04';
    try {
      mongo = await MongoMemoryServer.create({
        binary: {
          version: '6.0.12',
        },
      });
      process.env.MONGODB_URI = mongo.getUri();

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();
      connection = app.get<Connection>(getConnectionToken());
    } catch (error) {
      mongoAvailable = false;
      console.warn('MongoMemoryServer unavailable, skipping e2e tests.', error);
    }
  });

  afterEach(async () => {
    if (!mongoAvailable) {
      return;
    }
    if (connection) {
      await connection.db.dropDatabase();
    }
  });

  afterAll(async () => {
    if (!mongoAvailable) {
      return;
    }
    if (app) {
      await app.close();
    }
    if (connection) {
      await connection.close();
    }
    if (mongo) {
      await mongo.stop();
    }
  });

  it('manages a board lifecycle with cascaded deletions', async () => {
    if (!mongoAvailable) return;
    const server = app!.getHttpServer();

    const boardResponse = await request(server)
      .post('/boards')
      .send({ name: 'Roadmap', owner: 'Alice' })
      .expect(201);

    const boardId: string = boardResponse.body._id;

    const columnResponse = await request(server)
      .post('/columns')
      .send({ boardId, title: 'Backlog', position: 100 })
      .expect(201);

    const columnId: string = columnResponse.body._id;

    await request(server)
      .patch(`/columns/${columnId}`)
      .send({ title: 'Ideas' })
      .expect(200)
      .expect((res) => {
        expect(res.body.title).toBe('Ideas');
      });

    const taskResponse = await request(server)
      .post('/tasks')
      .send({
        boardId,
        columnId,
        title: 'Preparar demo',
        position: 100,
        description: 'Mostrar versión beta',
        assignee: 'Bob',
      })
      .expect(201);

    const taskId: string = taskResponse.body._id;

    await request(server)
      .patch(`/tasks/${taskId}`)
      .send({ title: 'Preparar demo pública' })
      .expect(200)
      .expect((res) => {
        expect(res.body.title).toBe('Preparar demo pública');
      });

    await request(server)
      .patch(`/tasks/${taskId}/move`)
      .send({ columnId, position: 200 })
      .expect(200)
      .expect((res) => {
        expect(res.body.position).toBe(200);
      });

    await request(server)
      .get(`/boards/${boardId}/summary`)
      .expect(200)
      .expect((res) => {
        expect(res.body.totalTasks).toBe(1);
        expect(res.body.columns[0]).toMatchObject({ count: 1 });
      });

    await request(server).delete(`/boards/${boardId}`).expect(200);

    await request(server)
      .get(`/columns/board/${boardId}`)
      .expect(200)
      .expect([]);

    await request(server).get(`/tasks/board/${boardId}`).expect(200).expect([]);

    await request(server).delete(`/boards/${boardId}`).expect(404);
  });

  it('returns 404 when updating or deleting missing resources', async () => {
    if (!mongoAvailable) return;
    const server = app!.getHttpServer();
    const missingId = new Types.ObjectId().toHexString();

    await request(server)
      .patch(`/columns/${missingId}`)
      .send({ title: 'Nada' })
      .expect(404);
    await request(server).delete(`/columns/${missingId}`).expect(404);
    await request(server)
      .patch(`/tasks/${missingId}`)
      .send({ title: 'Nada' })
      .expect(404);
    await request(server)
      .patch(`/tasks/${missingId}/move`)
      .send({ columnId: missingId, position: 100 })
      .expect(404);
    await request(server).delete(`/tasks/${missingId}`).expect(404);
    await request(server).delete(`/boards/${missingId}`).expect(404);
  });
});
