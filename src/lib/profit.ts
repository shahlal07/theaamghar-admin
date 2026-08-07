export type ProfitInputs = {
  // Raw product cost for this line -- fruit computes this as
  // purchasePricePerKg * boxSizeKg at the call site (see
  // ProfitCalculatorClient.tsx/VarietiesClient.tsx), non-fruit product
  // types use unitCost * qty. Kept as a single pre-computed number here so
  // this function stays product-type-agnostic, mirroring the same
  // generalization made to the calculate_order_profit() SQL trigger.
  productCost: number;
  sellingPrice: number;
  packagingBoxCost: number;
  foamPaperCost: number;
  brandingStickerCost: number;
  labourCost: number;
  shippingCost: number;
  marketingCostPerOrder: number;
  miscCost: number;
  paymentGatewayFeePercent: number;
};

export type ProfitResult = {
  productCost: number;
  shippingCost: number;
  totalCost: number;
  paymentGatewayFee: number;
  netRevenue: number;
  profit: number;
  profitMarginPercent: number;
  grossMarginPercent: number;
};

/**
 * Pure function — the entire reason the calculator can "instantly
 * recalculate everything" on any input change with zero network round
 * trips. Keep this side-effect free so it stays trivially unit-testable.
 */
export function calculateProfit(inputs: ProfitInputs): ProfitResult {
  const productCost = inputs.productCost;

  const totalCost =
    productCost +
    inputs.packagingBoxCost +
    inputs.foamPaperCost +
    inputs.brandingStickerCost +
    inputs.labourCost +
    inputs.shippingCost +
    inputs.marketingCostPerOrder +
    inputs.miscCost;

  const paymentGatewayFee =
    inputs.sellingPrice * (inputs.paymentGatewayFeePercent / 100);

  const netRevenue = inputs.sellingPrice - paymentGatewayFee;
  const profit = netRevenue - totalCost;

  const profitMarginPercent =
    inputs.sellingPrice > 0 ? (profit / inputs.sellingPrice) * 100 : 0;
  const grossMarginPercent =
    inputs.sellingPrice > 0
      ? ((inputs.sellingPrice - productCost) / inputs.sellingPrice) * 100
      : 0;

  return {
    productCost,
    shippingCost: inputs.shippingCost,
    totalCost,
    paymentGatewayFee,
    netRevenue,
    profit,
    profitMarginPercent,
    grossMarginPercent,
  };
}
