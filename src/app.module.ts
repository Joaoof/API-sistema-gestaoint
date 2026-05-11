import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { join } from 'path';
import { GqlThrottlerGuard } from './shared/guards/gql-throttler.guard';
import { GqlCacheInterceptor } from './shared/guards/gql-cache-interceptor.guard';
import { CacheModule } from '@nestjs/cache-manager';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { GraphQLExceptionFilter } from './infra/filters/gql-exception.filter';
import { CompanyModule } from './modules/company/company.module';
import { CashMovementModule } from './modules/cashMovement/cash-movement.module';
import { RedisModule } from './infra/cache/redis.module';
import { StorageModule } from './modules/storage/storage.module';
import { ProductModule } from './modules/product/product.module';
import { CustomerModule } from './modules/customer/customer.module';
import { AccountReceivableModule } from './modules/accountReceivable/account-receivable.module';
import { AccountPayableModule } from './modules/accountPayable/account-payable.module';
import { CategoryModule } from './modules/category/category.module';
import { OrderModule } from './modules/order/order.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { SellerModule } from './modules/seller/seller.module';
import { DriverModule } from './modules/driver/driver.module';
import { ConstructionModule } from './modules/construction/construction.module';
import { BankModule } from './modules/bank/bank.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { CompanyFiscalConfigModule } from './modules/companyFiscalConfig/company-fiscal-config.module';
import { AuditModule } from './modules/audit/audit.module';
import { CompanySettingsModule } from './modules/companySettings/company-settings.module';
import { FinancialAccountModule } from './modules/financialAccount/financial-account.module';
import { NotificationModule } from './modules/notification/notification.module';
import { NotificationTemplateModule } from './modules/notificationTemplate/notification-template.module';
import { MessageLogModule } from './modules/messageLog/message-log.module';
import { OpportunityModule } from './modules/opportunity/opportunity.module';
import { ContractModule } from './modules/contract/contract.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { WhatsappSessionModule } from './modules/whatsappSession/whatsapp-session.module';
import { TimelineModule } from './modules/timeline/timeline.module';
import { CompanyReminderModule } from './modules/companyReminder/company-reminder.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RecurringBillModule } from './modules/recurringBill/recurring-bill.module';
import { BankTransferModule } from './modules/bankTransfer/bank-transfer.module';
import { AdminModule } from './modules/admin/admin.module';
import { AiModule } from './modules/ai/ai.module';
import { AiCreditsModule } from './modules/aiCredits/ai-credits.module';
import { InsightsModule } from './modules/insights/insights.module';
import { ExportsModule } from './modules/exports/exports.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { FinancialsModule } from './modules/financials/financials.module';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';
import { BoletosModule } from './modules/boletos/boletos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
    }),
    GraphQLModule.forRoot({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/infra/graphql/schema.gql'),
      sortSchema: true,
      debug: true,
      subscriptions: {
        'graphql-ws': true,
      },
      server: {
        // landingPageDisabled: true,
        csrfPrevention: false, // 👈 Desativa a proteção
      },
      context: ({ request, reply }: { request: any; reply: any }) => ({
        req: request,
        reply,
        user: request?.user, // <- aqui, com "safe access"
      }),
    }),
    CacheModule.register({
      ttl: 60, // segundos
      max: 100, // número máximo de itens no cache
      isGlobal: true, // torna acessível em toda a aplicação
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    UserModule,
    AuthModule,
    CompanyModule,
    CashMovementModule,
    RedisModule,
    StorageModule,
    ProductModule,
    CustomerModule,
    AccountReceivableModule,
    AccountPayableModule,
    CategoryModule,
    OrderModule,
    DeliveryModule,
    SellerModule,
    DriverModule,
    ConstructionModule,
    BankModule,
    InvoiceModule,
    CompanyFiscalConfigModule,
    AuditModule,
    CompanySettingsModule,
    FinancialAccountModule,
    NotificationModule,
    NotificationTemplateModule,
    MessageLogModule,
    OpportunityModule,
    ContractModule,
    WhatsappModule,
    WhatsappSessionModule,
    TimelineModule,
    CompanyReminderModule,
    ReportsModule,
    RecurringBillModule,
    BankTransferModule,
    AdminModule,
    AiCreditsModule,
    AiModule,
    InsightsModule,
    ExportsModule,
    PaymentsModule,
    WarehouseModule,
    FinancialsModule,
    ReconciliationModule,
    BoletosModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: GqlThrottlerGuard, // Aqui usa o guard customizado
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: GqlCacheInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GraphQLExceptionFilter,
    },
  ],
})
export class AppModule {}
