-- Index every foreign key and hot filter column.
-- Postgres only auto-indexes PRIMARY KEY and UNIQUE, so tenant scoping (company_id),
-- ownership (customer_id, assigned_to) and status/date filters were all sequential scans.
-- CreateIndex
CREATE INDEX "addresses_customer_id_idx" ON "addresses"("customer_id");

-- CreateIndex
CREATE INDEX "addresses_customer_id_is_primary_idx" ON "addresses"("customer_id", "is_primary");

-- CreateIndex
CREATE INDEX "customer_product_insights_product_id_idx" ON "customer_product_insights"("product_id");

-- CreateIndex
CREATE INDEX "customer_vendor_sources_insight_id_idx" ON "customer_vendor_sources"("insight_id");

-- CreateIndex
CREATE INDEX "customers_company_id_idx" ON "customers"("company_id");

-- CreateIndex
CREATE INDEX "customers_assigned_to_idx" ON "customers"("assigned_to");

-- CreateIndex
CREATE INDEX "customers_company_id_updated_at_idx" ON "customers"("company_id", "updated_at");

-- CreateIndex
CREATE INDEX "customers_company_id_business_status_idx" ON "customers"("company_id", "business_status");

-- CreateIndex
CREATE INDEX "delete_requests_company_id_status_idx" ON "delete_requests"("company_id", "status");

-- CreateIndex
CREATE INDEX "delete_requests_requested_by_idx" ON "delete_requests"("requested_by");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "orders_company_id_idx" ON "orders"("company_id");

-- CreateIndex
CREATE INDEX "orders_customer_id_idx" ON "orders"("customer_id");

-- CreateIndex
CREATE INDEX "orders_company_id_status_idx" ON "orders"("company_id", "status");

-- CreateIndex
CREATE INDEX "orders_company_id_order_date_idx" ON "orders"("company_id", "order_date");

-- CreateIndex
CREATE INDEX "orders_customer_id_status_idx" ON "orders"("customer_id", "status");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "payments_company_id_idx" ON "payments"("company_id");

-- CreateIndex
CREATE INDEX "payments_customer_id_idx" ON "payments"("customer_id");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_company_id_status_idx" ON "payments"("company_id", "status");

-- CreateIndex
CREATE INDEX "payments_customer_id_status_idx" ON "payments"("customer_id", "status");

-- CreateIndex
CREATE INDEX "payments_company_id_payment_date_idx" ON "payments"("company_id", "payment_date");

-- CreateIndex
CREATE INDEX "products_company_id_is_active_idx" ON "products"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "users_company_id_idx" ON "users"("company_id");

