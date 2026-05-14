import { SetMetadata } from '@nestjs/common';

export const REQUIRES_MODULE_KEY = 'requiresModuleKey';

/**
 * Decora resolvers/controllers que dependem de um módulo estar habilitado
 * pra empresa. Use junto com `RequiresModuleGuard`.
 *
 *   @UseGuards(GqlAuthGuard, RequiresModuleGuard)
 *   @RequiresModule('chatbot_typebot')
 *   @Query(...) ...
 */
export const RequiresModule = (module_key: string) =>
  SetMetadata(REQUIRES_MODULE_KEY, module_key);
