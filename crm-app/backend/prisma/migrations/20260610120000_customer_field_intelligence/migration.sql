-- AlterTable
ALTER TABLE "customers" ADD COLUMN "customer_types" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "customer_product_insights" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "knows_product" BOOLEAN NOT NULL DEFAULT false,
    "is_selling" BOOLEAN,
    "discontinued_reason" TEXT,
    "notes" TEXT,
    "last_surveyed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_product_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_vendor_sources" (
    "id" TEXT NOT NULL,
    "insight_id" TEXT NOT NULL,
    "vendor_name" TEXT NOT NULL,
    "purchase_price" DOUBLE PRECISION,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "customer_vendor_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_product_insights_customer_id_product_id_key" ON "customer_product_insights"("customer_id", "product_id");

-- AddForeignKey
ALTER TABLE "customer_product_insights" ADD CONSTRAINT "customer_product_insights_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_product_insights" ADD CONSTRAINT "customer_product_insights_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_vendor_sources" ADD CONSTRAINT "customer_vendor_sources_insight_id_fkey" FOREIGN KEY ("insight_id") REFERENCES "customer_product_insights"("id") ON DELETE CASCADE ON UPDATE CASCADE;
