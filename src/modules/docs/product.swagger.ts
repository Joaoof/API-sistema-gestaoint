// src/modules/product/docs/product.swagger.ts
import { createRoute } from 'src/shared/swagger/swagger.utils';
import { CreateProductDto } from '../product/dtos/create-product.dto';

export const ProductSwagger = {
    create: createRoute({
        method: 'post',
        path: '/products',
        summary: 'Cria um novo produto',
        body: { type: 'object', $ref: '#/components/schemas/CreateProductDto' },
        responses: {
            201: {
                description: 'Produto criado com sucesso',
                type: 'object',
                example: {
                    id: 'prod_001',
                    name: 'Notebook',
                    description: 'Notebook Dell XPS',
                    price: 8999.99,
                    categoryId: 'cat_tecnologia',
                    supplierId: 'sup_dell',
                    createdAt: '2025-06-17T10:00:00Z'
                }
            },
            400: { description: 'Dados inválidos' }
        }
    }),
    findAll: createRoute({
        method: 'get',
        path: '/products',
        summary: 'Lista todos os produtos',
        responses: {
            200: {
                description: 'Lista de produtos',
                isArray: true,
                type: 'object',
                example: [
                    {
                        id: 'prod_001',
                        name: 'Notebook',
                        price: 8999.99
                    }
                ]
            }
        }
    }),
    findOne: createRoute({
        method: 'get',
        path: '/products/:id',
        summary: 'Busca produto por ID',
        responses: {
            200: {
                description: 'Produto encontrado',
                type: 'object',
                example: {
                    id: 'prod_001',
                    name: 'Notebook',
                    price: 8999.99
                }
            },
            404: { description: 'Produto não encontrado' }
        }
    })
};