import { AuthService } from './auth.service';

/**
 * Regressão: o login precisa propagar `isSuperAdmin` do banco até o token JWT.
 * Antes, a flag se perdia entre o registro do usuário, o `viewData` e o
 * `createTokenService`, fazendo o guard de super-admin bloquear todo mundo.
 */
describe('AuthService.login → propagação de isSuperAdmin', () => {
  const makeDeps = (userRow: any, cached: string | null = null) => {
    const validateInputZod = {
      isValid: jest
        .fn()
        .mockResolvedValue({ email: userRow.email, password_hash: 'hash' }),
    };
    const findAndValidateUser = {
      isValid: jest.fn().mockResolvedValue({ id: userRow.id, email: userRow.email }),
    };
    const createTokenService = {
      isCreated: jest
        .fn()
        .mockResolvedValue({ accessToken: 'tok', expiresIn: '3600s' }),
    };
    const buildUserDto = { buildUserDto: jest.fn().mockResolvedValue({}) };
    const redisService = {
      get: jest.fn().mockResolvedValue(cached),
      setWithPipeline: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const prisma = {
      users: { findUnique: jest.fn().mockResolvedValue(userRow) },
    };

    const service = new AuthService(
      validateInputZod as any,
      findAndValidateUser as any,
      createTokenService as any,
      buildUserDto as any,
      redisService as any,
      prisma as any,
    );
    return { service, createTokenService, redisService, prisma };
  };

  const baseRow = {
    id: 'u1',
    email: 'admin@empresa.com',
    role: 'ADMIN',
    company_id: 'c1',
    company: null,
  };

  it('inclui isSuperAdmin=true no token quando o usuário é super-admin', async () => {
    const { service, createTokenService } = makeDeps({
      ...baseRow,
      isSuperAdmin: true,
    });

    await service.login({ email: baseRow.email, password_hash: 'hash' } as any);

    expect(createTokenService.isCreated).toHaveBeenCalledWith(
      expect.objectContaining({ isSuperAdmin: true }),
    );
  });

  it('envia isSuperAdmin=false quando o usuário não é super-admin', async () => {
    const { service, createTokenService } = makeDeps({
      ...baseRow,
      isSuperAdmin: false,
    });

    await service.login({ email: baseRow.email, password_hash: 'hash' } as any);

    expect(createTokenService.isCreated).toHaveBeenCalledWith(
      expect.objectContaining({ isSuperAdmin: false }),
    );
  });

  it('invalida cache antigo sem is_super_admin e recalcula do banco', async () => {
    const staleCache = JSON.stringify({
      user_id: 'u1',
      user_email: baseRow.email,
      user_role: 'ADMIN',
      // sem is_super_admin → formato anterior ao fix
    });
    const { service, createTokenService, redisService, prisma } = makeDeps(
      { ...baseRow, isSuperAdmin: true },
      staleCache,
    );

    await service.login({ email: baseRow.email, password_hash: 'hash' } as any);

    // descartou o cache velho e refez a consulta no banco
    expect(redisService.delete).toHaveBeenCalled();
    expect(prisma.users.findUnique).toHaveBeenCalled();
    expect(createTokenService.isCreated).toHaveBeenCalledWith(
      expect.objectContaining({ isSuperAdmin: true }),
    );
  });
});
