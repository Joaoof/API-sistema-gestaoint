# 🛠️ TODO - Dev Log João

🕒 12/07/2025 - 01:19AM  
**PAREI AQUI:**  
Problema com `res.header is not a function` dentro do `GqlThrottlerGuard`.  
Suspeito que `reply` do Fastify precisa ser tratado diferente no contexto do GraphQL.

Próximos passos:

- Investigar como `FastifyReply` se comporta no Apollo Fastify.
- Ajustar CSP corretamente pro Playground carregar.
