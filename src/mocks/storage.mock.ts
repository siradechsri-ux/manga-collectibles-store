import type {
  OrderTimelineEvent,
  OrderTrackingDetail,
  OrderTrackingLineItem,
  OrderShipment,
} from "../components/OrderDetailView";
import { z } from "zod";
import {
  deductAdminProductInventory,
  restoreAdminProductInventory,
  resetAdminProducts,
} from "./admin-products.mock";

const MOCK_ORDERS_KEY = "mock_orders";
const LEGACY_MOCK_ORDERS_KEY = "manga-collectibles-mock-orders-v1";
export const MOCK_ORDERS_UPDATED_EVENT = "mock-orders-updated";
const MOCK_DEMO_ORDER_IDS = [
  91_000_001,
  91_000_002,
  91_000_003,
  91_000_004,
  91_000_005,
  91_000_006,
] as const;
const MOCK_CUSTOMER_ID = 9_001;

const mockStoredOrderSchema = z
  .object({
    detail: z
      .object({
        id: z.number().int().positive().safe(),
        orderNumber: z.string().min(1),
        createdAt: z.string().datetime({ offset: true }),
        status: z.enum([
          "UNPAID",
          "CANCELLED",
          "ORDER_PLACED",
          "DEPOSIT_PAID",
          "AWAITING_BALANCE_PAYMENT",
          "PAID",
          "PACKING",
          "SHIPPED",
          "DELIVERED",
          "DEPOSIT_FORFEITED",
        ]),
        timelineStage: z.enum([
          "ORDER_PLACED",
          "DEPOSIT_PAID",
          "ARRIVED_IN_THAILAND",
          "SHIPPED",
        ]),
        paymentStatus: z.enum([
          "UNPAID",
          "PAID",
          "DEPOSIT_PAID",
          "DEPOSIT_FORFEITED",
        ]),
        totalAmount: z.number().finite().nonnegative(),
        paidAmount: z.number().finite().nonnegative(),
        remainingBalance: z.number().finite().nonnegative(),
        balanceDueDate: z.string().datetime({ offset: true }).nullable(),
        items: z.array(
          z
            .object({
              id: z.string().min(1),
              productVariantId: z.number().int().positive().safe().optional(),
              title: z.string(),
              productType: z.enum(["MANGA", "FIGURE"]),
              volumeLabel: z.string().optional(),
              quantity: z.number().int().positive(),
              imageUrl: z.string().optional(),
              paymentType: z.enum(["FULL", "DEPOSIT"]),
              lineTotal: z.number().finite().nonnegative(),
              remainingBalance: z.number().finite().nonnegative(),
              isPreorder: z.boolean(),
            })
            .strict(),
        ),
        timeline: z.array(
          z
            .object({
              stage: z.enum([
                "ORDER_PLACED",
                "DEPOSIT_PAID",
                "ARRIVED_IN_THAILAND",
                "SHIPPED",
              ]),
              label: z.string(),
              occurredAt: z.string().datetime({ offset: true }).nullable(),
            })
            .strict(),
        ),
        shipments: z.array(
          z
            .object({
              id: z.string().min(1),
              label: z.string(),
              shipmentType: z.enum(["IN_STOCK", "PREORDER"]),
              status: z.enum(["PREPARING", "SHIPPED", "DELIVERED"]),
              carrier: z.enum(["FLASH", "THAI_POST"]).nullable(),
              trackingNumber: z.string().nullable(),
              shippedAt: z.string().datetime({ offset: true }).nullable(),
              items: z.array(
                z
                  .object({
                    id: z.string().min(1),
                    title: z.string(),
                    quantity: z.number().int().positive(),
                  })
                  .strict(),
              ),
            })
            .strict(),
        ),
      })
      .strict(),
    paymentQrCodeDataUrl: z
      .string()
      .regex(
        /^(?:data:image\/png;base64,[A-Za-z0-9+/=]+|data:image\/svg\+xml;charset=utf-8,%3Csvg[\s\S]+)$/i,
      ),
    inventoryReserved: z.boolean().optional(),
    shippingAddress: z
      .object({
        recipientName: z.string(),
        recipientPhone: z.string(),
        addressLine: z.string(),
        addressVillage: z.string().optional(),
        street: z.string().optional(),
        subdistrict: z.string(),
        district: z.string(),
        province: z.string(),
        postalCode: z.string(),
      })
      .strict()
      .optional(),
    immediateAmount: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
    taxSummary: z
      .object({
        mangaVatExemptAmount: z.string(),
        figureAndShippingTaxableGross: z.string(),
        vatBaseAmount: z.string(),
        vatAmount: z.string(),
        taxInvoiceRequested: z.boolean(),
        taxInvoiceCustomer: z
          .object({
            entityType: z.enum(["INDIVIDUAL", "CORPORATION"]),
            companyOrName: z.string(),
            maskedTaxId: z.string(),
            address: z.string(),
          })
          .optional(),
      })
      .optional(),
  })
  .extend({
    ownerUserId: z.number().int().positive().safe().optional(),
  })
  .strict();

const mockStoredOrdersSchema = z.array(mockStoredOrderSchema);

const mockCheckoutResponseSchema = z
  .object({
    orderId: z.number().int().positive().safe(),
    orderNumber: z.string().min(1),
    totalAmount: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
    shippingFee: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
    immediateAmount: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
    remainingBalanceAmount: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
    paymentStatus: z.literal("UNPAID"),
    paymentQrCodeDataUrl: z
      .string()
      .regex(
        /^(?:data:image\/png;base64,[A-Za-z0-9+/=]+|data:image\/svg\+xml;charset=utf-8,%3Csvg[\s\S]+)$/i,
      ),
    items: z.array(
      z
        .object({
          productVariantId: z.number().int().positive().safe(),
          productType: z.enum([
            "MANGA_INSTOCK",
            "MANGA_PREORDER",
            "FIGURE_FULL",
            "FIGURE_DEPOSIT",
          ]),
          title: z.string(),
          volumeNumber: z.number().int().positive().optional(),
          variantLabel: z.string().optional(),
          quantity: z.number().int().positive(),
          unitPrice: z.string(),
          lineTotal: z.string(),
          paymentType: z.enum(["FULL", "DEPOSIT"]),
          balanceAmount: z.string(),
          isPreorder: z.boolean(),
          productCategory: z.enum(["MANGA", "FIGURE"]),
        })
        .strict(),
    ),
    createdAt: z.string().datetime({ offset: true }),
    shippingAddress: z
      .object({
        recipientName: z.string(),
        recipientPhone: z.string(),
        addressLine: z.string(),
        addressVillage: z.string().optional(),
        street: z.string().optional(),
        subdistrict: z.string(),
        district: z.string(),
        province: z.string(),
        postalCode: z.string(),
      })
      .strict()
      .optional(),
    taxSummary: z
      .object({
        mangaVatExemptAmount: z.string(),
        figureAndShippingTaxableGross: z.string(),
        vatBaseAmount: z.string(),
        vatAmount: z.string(),
        taxInvoiceRequested: z.boolean(),
        taxInvoiceCustomer: z
          .object({
            entityType: z.enum(["INDIVIDUAL", "CORPORATION"]),
            companyOrName: z.string(),
            maskedTaxId: z.string(),
            address: z.string(),
          })
          .optional(),
      })
      .optional(),
  })
  .passthrough();

export interface MockStoredOrder {
  ownerUserId?: number;
  detail: OrderTrackingDetail;
  paymentQrCodeDataUrl: string;
  inventoryReserved?: boolean;
  shippingAddress?: MockShippingAddress;
  immediateAmount: string;
  taxSummary?: MockTaxSummary;
}

export interface MockShippingAddress {
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  addressVillage?: string;
  street?: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
}

export interface MockTaxSummary {
  mangaVatExemptAmount: string;
  figureAndShippingTaxableGross: string;
  vatBaseAmount: string;
  vatAmount: string;
  taxInvoiceRequested: boolean;
  taxInvoiceCustomer?: {
    entityType: "INDIVIDUAL" | "CORPORATION";
    companyOrName: string;
    maskedTaxId: string;
    address: string;
  };
}

function readAllOrders(): MockStoredOrder[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedValue =
      window.localStorage.getItem(MOCK_ORDERS_KEY) ??
      window.localStorage.getItem(LEGACY_MOCK_ORDERS_KEY);
    if (!storedValue) {
      const demoOrders = createDemoOrders();
      writeAllOrders(demoOrders);
      return demoOrders;
    }
    const parsed: unknown = JSON.parse(storedValue);
    const validated = mockStoredOrdersSchema.safeParse(parsed);
    if (!validated.success) {
      console.error("Stored mock orders have an invalid shape.", validated.error);
      window.localStorage.removeItem(MOCK_ORDERS_KEY);
      const demoOrders = createDemoOrders();
      writeAllOrders(demoOrders);
      return demoOrders;
    }
    if (!window.localStorage.getItem(MOCK_ORDERS_KEY)) {
      window.localStorage.setItem(MOCK_ORDERS_KEY, JSON.stringify(validated.data));
      window.localStorage.removeItem(LEGACY_MOCK_ORDERS_KEY);
    }
    const existingIds = new Set(
      validated.data.map((order) => order.detail.id),
    );
    const missingDemoOrders = createDemoOrders().filter(
      (order) => !existingIds.has(order.detail.id),
    );
    if (missingDemoOrders.length === 0) {
      return validated.data;
    }
    const combinedOrders = [...missingDemoOrders, ...validated.data];
    writeAllOrders(combinedOrders);
    return combinedOrders;
  } catch (error) {
    console.error("Could not read mock orders from local storage.", error);
    return [];
  }
}

function writeAllOrders(orders: MockStoredOrder[]): void {
  if (typeof window === "undefined") {
    throw new Error("Mock orders can only be saved in a browser session.");
  }
  try {
    window.localStorage.setItem(MOCK_ORDERS_KEY, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent(MOCK_ORDERS_UPDATED_EVENT));
  } catch (error) {
    console.error("Could not persist mock orders to local storage.", error);
    throw new Error("ไม่สามารถบันทึกคำสั่งซื้อสำหรับ Prototype ได้", {
      cause: error,
    });
  }
}

function makeTimeline(createdAt: string): OrderTimelineEvent[] {
  return [
    { stage: "ORDER_PLACED", label: "สั่งซื้อแล้ว", occurredAt: createdAt },
    { stage: "DEPOSIT_PAID", label: "รับยอดชำระ", occurredAt: null },
    { stage: "ARRIVED_IN_THAILAND", label: "สินค้าเข้าไทย", occurredAt: null },
    { stage: "SHIPPED", label: "จัดส่งแล้ว", occurredAt: null },
  ];
}

function makeShipments(items: OrderTrackingLineItem[]): OrderShipment[] {
  const inStockItems = items.filter((item) => !item.isPreorder);
  const preorderItems = items.filter((item) => item.isPreorder);
  const shipments: OrderShipment[] = [];
  if (inStockItems.length > 0) {
    shipments.push({
      id: "demo-instock",
      label: "กล่องสินค้าพร้อมส่ง",
      shipmentType: "IN_STOCK",
      status: "PREPARING",
      carrier: null,
      trackingNumber: null,
      shippedAt: null,
      items: inStockItems.map((item) => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
      })),
    });
  }
  if (preorderItems.length > 0) {
    shipments.push({
      id: "demo-preorder",
      label: "กล่องสินค้าพรีออเดอร์",
      shipmentType: "PREORDER",
      status: "PREPARING",
      carrier: null,
      trackingNumber: null,
      shippedAt: null,
      items: preorderItems.map((item) => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
      })),
    });
  }
  return shipments;
}

function makeDemoQrDataUrl(orderNumber: string, amount: number): string {
  const label = `${orderNumber} · ฿${amount.toFixed(2)} · QR DEMO`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" rx="18" fill="#fff"/><rect x="16" y="16" width="208" height="208" rx="12" fill="#f8fafc" stroke="#cbd5e1"/><path d="M35 35h55v55H35zM47 47v31h31V47zM150 35h55v55h-55zM162 47v31h31V47zM35 150h55v55H35zM47 162v31h31v-31zM108 35h14v14h-14zM108 63h14v14h-14zM108 91h14v14h-14zM136 105h14v14h-14zM164 105h14v14h-14zM192 105h13v14h-13zM105 133h14v14h-14zM133 133h14v14h-14zM161 133h14v14h-14zM105 161h14v14h-14zM133 189h14v14h-14zM161 175h14v14h-14zM189 161h14v14h-14z" fill="#0f172a"/><text x="120" y="226" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#475569">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

interface DemoOrderInput {
  id: number;
  orderNumber: string;
  daysAgo: number;
  status: OrderTrackingDetail["status"];
  paymentStatus: OrderTrackingDetail["paymentStatus"];
  timelineStage: OrderTrackingDetail["timelineStage"];
  totalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  immediateAmount: number;
  balanceDueInDays?: number;
  items: OrderTrackingLineItem[];
  shipped?: boolean;
}

function createDemoOrder(input: DemoOrderInput): MockStoredOrder {
  const now = Date.now();
  const createdAt = new Date(now - input.daysAgo * 24 * 60 * 60 * 1_000);
  const createdAtIso = createdAt.toISOString();
  const paidAt = new Date(createdAt.getTime() + 4 * 60 * 1_000).toISOString();
  const arrivedAt =
    input.timelineStage === "ARRIVED_IN_THAILAND" ||
    input.timelineStage === "SHIPPED"
      ? new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1_000).toISOString()
      : null;
  const shippedAt = input.shipped
    ? new Date(createdAt.getTime() + 4 * 24 * 60 * 60 * 1_000).toISOString()
    : null;
  const balanceDueDate =
    input.balanceDueInDays === undefined
      ? null
      : new Date(now + input.balanceDueInDays * 24 * 60 * 60 * 1_000).toISOString();
  const shipments = makeShipments(input.items).map((shipment, index) =>
    input.shipped
      ? {
          ...shipment,
          status: "SHIPPED" as const,
          carrier: index % 2 === 0 ? ("FLASH" as const) : ("THAI_POST" as const),
          trackingNumber: `DEMO${String(input.id).slice(-6)}${String(index + 1).padStart(2, "0")}`,
          shippedAt,
        }
      : shipment,
  );
  const timeline: OrderTimelineEvent[] = [
    { stage: "ORDER_PLACED", label: "สั่งซื้อแล้ว", occurredAt: createdAtIso },
    {
      stage: "DEPOSIT_PAID",
      label:
        input.paymentStatus === "DEPOSIT_PAID"
          ? "ยืนยันการชำระมัดจำ (DEMO)"
          : input.paymentStatus === "PAID"
            ? "ยืนยันการชำระเงิน (DEMO)"
            : "รับยอดชำระ",
      occurredAt: input.paymentStatus === "UNPAID" ? null : paidAt,
    },
    {
      stage: "ARRIVED_IN_THAILAND",
      label: "สินค้าเข้าไทย",
      occurredAt: arrivedAt,
    },
    {
      stage: "SHIPPED",
      label: "จัดส่งแล้ว",
      occurredAt: shippedAt,
    },
  ];
  const detail: OrderTrackingDetail = {
    id: input.id,
    orderNumber: input.orderNumber,
    createdAt: createdAtIso,
    status: input.status,
    timelineStage: input.timelineStage,
    paymentStatus: input.paymentStatus,
    totalAmount: input.totalAmount,
    paidAmount: input.paidAmount,
    remainingBalance: input.remainingBalance,
    balanceDueDate,
    items: input.items,
    timeline,
    shipments,
  };
  const mangaVatExemptAmount = input.items
    .filter((item) => item.productType === "MANGA")
    .reduce((total, item) => total + item.lineTotal, 0);
  const taxableGross = input.items
    .filter((item) => item.productType === "FIGURE")
    .reduce((total, item) => total + item.lineTotal, 0) +
    Math.max(
      0,
      input.totalAmount -
        input.items.reduce((total, item) => total + item.lineTotal, 0),
    );
  const vatAmount = Math.round((taxableGross * 7 * 100) / 107) / 100;
  return {
    ownerUserId: MOCK_CUSTOMER_ID,
    detail,
    paymentQrCodeDataUrl: makeDemoQrDataUrl(
      input.orderNumber,
      input.immediateAmount,
    ),
    immediateAmount: input.immediateAmount.toFixed(2),
    taxSummary: {
      mangaVatExemptAmount: mangaVatExemptAmount.toFixed(2),
      figureAndShippingTaxableGross: taxableGross.toFixed(2),
      vatBaseAmount: (taxableGross - vatAmount).toFixed(2),
      vatAmount: vatAmount.toFixed(2),
      taxInvoiceRequested: false,
    },
  };
}

function createDemoOrders(): MockStoredOrder[] {
  return [
    createDemoOrder({
      id: MOCK_DEMO_ORDER_IDS[0],
      orderNumber: "DEMO-ORDER-READY-001",
      daysAgo: 3,
      status: "PAID",
      paymentStatus: "PAID",
      timelineStage: "DEPOSIT_PAID",
      totalAmount: 1_630,
      paidAmount: 1_630,
      remainingBalance: 0,
      immediateAmount: 1_630,
      items: [
        {
          id: "demo-1-manga-1",
          title: "มหาเวทย์ผนึกมาร เล่ม 25",
          productType: "MANGA",
          volumeLabel: "เล่ม 25",
          quantity: 2,
          paymentType: "FULL",
          lineTotal: 190,
          remainingBalance: 0,
          isPreorder: false,
        },
        {
          id: "demo-1-figure",
          title: "Pop Up Parade Sukuna",
          productType: "FIGURE",
          quantity: 1,
          paymentType: "FULL",
          lineTotal: 1_400,
          remainingBalance: 0,
          isPreorder: false,
        },
      ],
    }),
    createDemoOrder({
      id: MOCK_DEMO_ORDER_IDS[1],
      orderNumber: "DEMO-ORDER-DEPOSIT-002",
      daysAgo: 8,
      status: "DEPOSIT_PAID",
      paymentStatus: "DEPOSIT_PAID",
      timelineStage: "DEPOSIT_PAID",
      totalAmount: 1_890,
      paidAmount: 540,
      remainingBalance: 1_350,
      immediateAmount: 540,
      items: [
        {
          id: "demo-2-figure",
          title: "Nendoroid Gojo Satoru",
          productType: "FIGURE",
          quantity: 1,
          paymentType: "DEPOSIT",
          lineTotal: 1_850,
          remainingBalance: 1_350,
          isPreorder: true,
        },
      ],
    }),
    createDemoOrder({
      id: MOCK_DEMO_ORDER_IDS[2],
      orderNumber: "DEMO-ORDER-BALANCE-003",
      daysAgo: 20,
      status: "AWAITING_BALANCE_PAYMENT",
      paymentStatus: "DEPOSIT_PAID",
      timelineStage: "ARRIVED_IN_THAILAND",
      totalAmount: 1_890,
      paidAmount: 540,
      remainingBalance: 1_350,
      immediateAmount: 540,
      balanceDueInDays: 9,
      items: [
        {
          id: "demo-3-figure",
          title: "Nendoroid Gojo Satoru",
          productType: "FIGURE",
          quantity: 1,
          paymentType: "DEPOSIT",
          lineTotal: 1_850,
          remainingBalance: 1_350,
          isPreorder: true,
        },
      ],
    }),
    createDemoOrder({
      id: MOCK_DEMO_ORDER_IDS[3],
      orderNumber: "DEMO-ORDER-SHIPPED-004",
      daysAgo: 12,
      status: "SHIPPED",
      paymentStatus: "PAID",
      timelineStage: "SHIPPED",
      totalAmount: 270,
      paidAmount: 270,
      remainingBalance: 0,
      immediateAmount: 270,
      shipped: true,
      items: [
        {
          id: "demo-4-manga-1",
          title: "นครเร้นจันทร์ เล่ม 1",
          productType: "MANGA",
          volumeLabel: "เล่ม 1",
          quantity: 2,
          paymentType: "FULL",
          lineTotal: 230,
          remainingBalance: 0,
          isPreorder: false,
        },
      ],
    }),
    createDemoOrder({
      id: MOCK_DEMO_ORDER_IDS[4],
      orderNumber: "DEMO-ORDER-UNPAID-005",
      daysAgo: 0,
      status: "UNPAID",
      paymentStatus: "UNPAID",
      timelineStage: "ORDER_PLACED",
      totalAmount: 390,
      paidAmount: 0,
      remainingBalance: 0,
      immediateAmount: 390,
      items: [
        {
          id: "demo-5-manga-limited",
          title: "มหาเวทย์ผนึกมาร เล่ม 26 (Limited Set)",
          productType: "MANGA",
          volumeLabel: "เล่ม 26 · Limited Set",
          quantity: 1,
          paymentType: "FULL",
          lineTotal: 350,
          remainingBalance: 0,
          isPreorder: true,
        },
      ],
    }),
    createDemoOrder({
      id: MOCK_DEMO_ORDER_IDS[5],
      orderNumber: "DEMO-ORDER-SPLIT-006",
      daysAgo: 6,
      status: "PAID",
      paymentStatus: "PAID",
      timelineStage: "DEPOSIT_PAID",
      totalAmount: 2_789,
      paidAmount: 2_789,
      remainingBalance: 0,
      immediateAmount: 2_789,
      items: [
        {
          id: "demo-6-manga",
          title: "บันทึกนักปรุงยาแห่งหอคอย เล่ม 2",
          productType: "MANGA",
          volumeLabel: "เล่ม 2",
          quantity: 1,
          paymentType: "FULL",
          lineTotal: 99,
          remainingBalance: 0,
          isPreorder: false,
        },
        {
          id: "demo-6-figure",
          title: "Moonlit City Guardian - Collector Figure",
          productType: "FIGURE",
          quantity: 1,
          paymentType: "FULL",
          lineTotal: 2_650,
          remainingBalance: 0,
          isPreorder: true,
        },
      ],
    }),
  ];
}

export function saveMockOrder(
  input: unknown,
  ownerUserId?: number,
): MockStoredOrder {
  const parsedResponse = mockCheckoutResponseSchema.safeParse(input);
  if (!parsedResponse.success) {
    throw new TypeError(
      `ข้อมูลคำสั่งซื้อจำลองไม่ถูกต้อง: ${parsedResponse.error.issues
        .map((issue) => issue.message)
        .join("; ")}`,
    );
  }
  const response = parsedResponse.data;
  const createdAt = response.createdAt;
  const items: OrderTrackingLineItem[] = response.items.map((item, index) => ({
    id: `${response.orderId}-${index + 1}`,
    productVariantId: item.productVariantId,
    title: item.title,
    productType: item.productCategory,
    ...(item.volumeNumber
      ? { volumeLabel: `เล่ม ${item.volumeNumber}${item.variantLabel ? ` · ${item.variantLabel}` : ""}` }
      : {}),
    quantity: item.quantity,
    paymentType: item.paymentType,
    lineTotal: Number(item.lineTotal),
    remainingBalance: Number(item.balanceAmount),
    isPreorder: item.isPreorder,
  }));
  const detail: OrderTrackingDetail = {
    id: response.orderId,
    orderNumber: response.orderNumber,
    createdAt,
    status: "UNPAID",
    timelineStage: "ORDER_PLACED",
    paymentStatus: "UNPAID",
    totalAmount: Number(response.totalAmount),
    paidAmount: 0,
    remainingBalance: Number(response.remainingBalanceAmount),
    balanceDueDate: null,
    items,
    timeline: makeTimeline(createdAt),
    shipments: makeShipments(items),
  };
  const storedOrder: MockStoredOrder = {
    ...(ownerUserId ? { ownerUserId } : {}),
    detail,
    paymentQrCodeDataUrl: response.paymentQrCodeDataUrl,
    inventoryReserved: true,
    ...(response.shippingAddress
      ? { shippingAddress: response.shippingAddress }
      : {}),
    immediateAmount: response.immediateAmount,
    ...(response.taxSummary ? { taxSummary: response.taxSummary } : {}),
  };
  const previousOrders = readAllOrders();
  const nextOrders = [
    storedOrder,
    ...previousOrders.filter((order) => order.detail.id !== response.orderId),
  ];
  const inventoryItems = items.flatMap((item) =>
    item.productVariantId
      ? [{
          productVariantId: item.productVariantId,
          quantity: item.quantity,
        }]
      : [],
  );
  deductAdminProductInventory(inventoryItems);
  try {
    writeAllOrders(nextOrders);
  } catch (error) {
    restoreAdminProductInventory(
      items.flatMap((item) =>
        item.productVariantId
          ? [{
              productVariantId: item.productVariantId,
              quantity: item.quantity,
              isPreorder: item.isPreorder,
            }]
          : [],
      ),
    );
    throw error;
  }
  return storedOrder;
}

export function getMockOrder(orderId: number): MockStoredOrder | null {
  return readAllOrders().find((order) => order.detail.id === orderId) ?? null;
}

export function listMockOrders(ownerUserId?: number): MockStoredOrder[] {
  const orders = readAllOrders();
  return ownerUserId === undefined
    ? orders
    : orders.filter((order) => order.ownerUserId === ownerUserId);
}

export function updateMockOrderPayment(
  orderId: number,
  paymentStatus: "PAID" | "DEPOSIT_PAID",
  transactionRef: string,
  paymentStage: "INITIAL" | "BALANCE" = "INITIAL",
): MockStoredOrder {
  const orders = readAllOrders();
  const orderIndex = orders.findIndex((order) => order.detail.id === orderId);
  const existingOrder = orders[orderIndex];
  if (!existingOrder) {
    throw new Error("ไม่พบคำสั่งซื้อจำลองในอุปกรณ์นี้");
  }
  if (existingOrder.detail.status === "CANCELLED") {
    throw new Error("คำสั่งซื้อนี้ถูกยกเลิกแล้วและไม่สามารถชำระเงินได้");
  }

  const paidAt = new Date().toISOString();
  const isDepositPayment = paymentStatus === "DEPOSIT_PAID";
  const isBalancePayment = paymentStage === "BALANCE";
  if (isBalancePayment && existingOrder.detail.status !== "AWAITING_BALANCE_PAYMENT") {
    throw new Error("คำสั่งซื้อนี้ยังไม่เปิดรับชำระยอดคงเหลือ");
  }
  const updatedDetail: OrderTrackingDetail = {
    ...existingOrder.detail,
    status: isBalancePayment ? "PAID" : paymentStatus,
    paymentStatus,
    timelineStage: "DEPOSIT_PAID",
    paidAmount: isBalancePayment
      ? existingOrder.detail.totalAmount
      : Number(existingOrder.immediateAmount),
    remainingBalance: isBalancePayment
      ? 0
      : isDepositPayment
        ? existingOrder.detail.remainingBalance
        : 0,
    items: isBalancePayment
      ? existingOrder.detail.items.map((item) => ({
          ...item,
          remainingBalance: 0,
        }))
      : existingOrder.detail.items,
    ...(isBalancePayment ? { balanceDueDate: null } : {}),
    timeline: existingOrder.detail.timeline.map((event) =>
      event.stage === "DEPOSIT_PAID"
        ? {
            ...event,
            label: `ยืนยันการชำระเงิน (${transactionRef})`,
            occurredAt: paidAt,
          }
        : event,
    ),
  };
  const updatedOrder = { ...existingOrder, detail: updatedDetail };
  orders[orderIndex] = updatedOrder;
  writeAllOrders(orders);
  return updatedOrder;
}

export function cancelMockOrder(
  orderId: number,
  ownerUserId: number,
): MockStoredOrder {
  const orders = readAllOrders();
  const orderIndex = orders.findIndex((order) => order.detail.id === orderId);
  const existingOrder = orders[orderIndex];
  if (!existingOrder) {
    throw new Error("ไม่พบคำสั่งซื้อในระบบ");
  }
  if (existingOrder.ownerUserId !== ownerUserId) {
    throw new Error("ไม่มีสิทธิ์ยกเลิกคำสั่งซื้อนี้");
  }
  if (
    existingOrder.detail.status !== "UNPAID" ||
    existingOrder.detail.paymentStatus !== "UNPAID"
  ) {
    throw new Error("ยกเลิกได้เฉพาะคำสั่งซื้อที่ยังไม่ชำระเงิน");
  }

  const cancelledOrder: MockStoredOrder = {
    ...existingOrder,
    inventoryReserved: false,
    detail: {
      ...existingOrder.detail,
      status: "CANCELLED",
    },
  };
  const reservedItems = existingOrder.detail.items.flatMap((item) =>
    item.productVariantId
      ? [{
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          isPreorder: item.isPreorder,
        }]
      : [],
  );
  if (existingOrder.inventoryReserved) {
    restoreAdminProductInventory(reservedItems);
  }
  orders[orderIndex] = cancelledOrder;
  try {
    writeAllOrders(orders);
  } catch (error) {
    if (existingOrder.inventoryReserved) {
      deductAdminProductInventory(
        reservedItems.map(({ productVariantId, quantity }) => ({
          productVariantId,
          quantity,
        })),
      );
    }
    throw error;
  }
  return cancelledOrder;
}

export function markMockOrderArrived(orderId: number): MockStoredOrder {
  const orders = readAllOrders();
  const orderIndex = orders.findIndex((order) => order.detail.id === orderId);
  const existingOrder = orders[orderIndex];
  if (!existingOrder) {
    throw new Error("ไม่พบคำสั่งซื้อจำลองในอุปกรณ์นี้");
  }
  if (existingOrder.detail.paymentStatus !== "DEPOSIT_PAID") {
    throw new Error("จำลองสินค้าเข้าไทยได้หลังชำระมัดจำแล้วเท่านั้น");
  }
  if (existingOrder.detail.remainingBalance <= 0) {
    throw new Error("คำสั่งซื้อนี้ไม่มียอดคงเหลือ");
  }

  const arrivedAt = new Date();
  const dueDate = new Date(arrivedAt.getTime() + 14 * 24 * 60 * 60 * 1_000);
  const updatedDetail: OrderTrackingDetail = {
    ...existingOrder.detail,
    status: "AWAITING_BALANCE_PAYMENT",
    timelineStage: "ARRIVED_IN_THAILAND",
    balanceDueDate: dueDate.toISOString(),
    timeline: existingOrder.detail.timeline.map((event) =>
      event.stage === "ARRIVED_IN_THAILAND"
        ? {
            ...event,
            label: "สินค้าเข้าไทย (จำลอง)",
            occurredAt: arrivedAt.toISOString(),
          }
        : event,
    ),
  };
  const updatedOrder = { ...existingOrder, detail: updatedDetail };
  orders[orderIndex] = updatedOrder;
  writeAllOrders(orders);
  return updatedOrder;
}

export function markAllMockDepositOrdersArrived(): {
  updatedOrders: MockStoredOrder[];
  updatedCount: number;
} {
  const orders = readAllOrders();
  const arrivedAt = new Date();
  const dueDate = new Date(arrivedAt.getTime() + 14 * 24 * 60 * 60 * 1_000);
  const updatedOrders = orders.map((order) => {
    if (
      order.detail.paymentStatus !== "DEPOSIT_PAID" ||
      order.detail.remainingBalance <= 0 ||
      order.detail.status === "AWAITING_BALANCE_PAYMENT"
    ) {
      return order;
    }
    return {
      ...order,
      detail: {
        ...order.detail,
        status: "AWAITING_BALANCE_PAYMENT" as const,
        timelineStage: "ARRIVED_IN_THAILAND" as const,
        balanceDueDate: dueDate.toISOString(),
        timeline: order.detail.timeline.map((event) =>
          event.stage === "ARRIVED_IN_THAILAND"
            ? {
                ...event,
                label: "สินค้าเข้าไทย (จำลอง)",
                occurredAt: arrivedAt.toISOString(),
              }
            : event,
        ),
      },
    };
  });
  const changedOrders = updatedOrders.filter(
    (order, index) => order !== orders[index],
  );
  if (changedOrders.length > 0) {
    writeAllOrders(updatedOrders);
  }
  return { updatedOrders: changedOrders, updatedCount: changedOrders.length };
}

export function markMockOrderShipped(orderId: number): MockStoredOrder {
  const orders = readAllOrders();
  const orderIndex = orders.findIndex((order) => order.detail.id === orderId);
  const existingOrder = orders[orderIndex];
  if (!existingOrder) {
    throw new Error("ไม่พบคำสั่งซื้อจำลองในอุปกรณ์นี้");
  }
  if (existingOrder.detail.paymentStatus !== "PAID") {
    throw new Error("จัดส่งได้หลังชำระเงินครบแล้วเท่านั้น");
  }
  if (existingOrder.detail.status === "SHIPPED") {
    throw new Error("คำสั่งซื้อนี้จัดส่งแล้ว");
  }

  const shippedAt = new Date().toISOString();
  const updatedShipments = existingOrder.detail.shipments.map(
    (shipment, index) =>
      shipment.status === "PREPARING"
        ? {
            ...shipment,
            status: "SHIPPED" as const,
            carrier: "FLASH" as const,
            trackingNumber: `DEMO${String(orderId).slice(-6)}${String(index + 1).padStart(2, "0")}`,
            shippedAt,
          }
        : shipment,
  );
  if (!updatedShipments.some((shipment) => shipment.status === "SHIPPED")) {
    throw new Error("ไม่มีพัสดุที่รอจัดส่ง");
  }
  const updatedOrder: MockStoredOrder = {
    ...existingOrder,
    detail: {
      ...existingOrder.detail,
      status: "SHIPPED",
      timelineStage: "SHIPPED",
      shipments: updatedShipments,
      timeline: existingOrder.detail.timeline.map((event) =>
        event.stage === "SHIPPED"
          ? {
              ...event,
              label: "จัดส่งแล้ว (จำลอง)",
              occurredAt: shippedAt,
            }
          : event,
      ),
    },
  };
  orders[orderIndex] = updatedOrder;
  writeAllOrders(orders);
  return updatedOrder;
}

export interface MockWaitlistEntry {
  id: number;
  productId?: string;
  userId?: number;
  productName: string;
  customerName: string;
  customerEmail: string;
  queuePosition: number;
  status: "WAITING" | "OFFERED";
  createdAt: string;
}

export const MOCK_WAITLIST_STORAGE_KEY = "mock_waitlist";
export const MOCK_WAITLIST_UPDATED_EVENT = "mock-waitlist-updated";

const waitlistEntrySchema = z
  .object({
    id: z.number().int().positive().safe(),
    productId: z.string().min(1).optional(),
    userId: z.number().int().positive().safe().optional(),
    productName: z.string().min(1),
    customerName: z.string().min(1),
    customerEmail: z.string().email(),
    queuePosition: z.number().int().positive(),
    status: z.enum(["WAITING", "OFFERED"]),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();

const waitlistEntriesSchema = z.array(waitlistEntrySchema);

const MOCK_WAITLIST_ENTRIES: readonly MockWaitlistEntry[] = [
  {
    id: 1,
    productName: "Nendoroid Gojo Satoru",
    customerName: "คุณนภัส",
    customerEmail: "napas@example.test",
    queuePosition: 1,
    status: "WAITING",
    createdAt: "2026-10-01T09:30:00.000+07:00",
  },
  {
    id: 2,
    productName: "Nendoroid Gojo Satoru",
    customerName: "คุณกิตติ",
    customerEmail: "kitti@example.test",
    queuePosition: 2,
    status: "WAITING",
    createdAt: "2026-10-02T14:10:00.000+07:00",
  },
  {
    id: 3,
    productName: "Pop Up Parade Sukuna",
    customerName: "คุณอร",
    customerEmail: "orn@example.test",
    queuePosition: 1,
    status: "OFFERED",
    createdAt: "2026-10-03T11:00:00.000+07:00",
  },
  {
    id: 4,
    productName: "Moonlit City Guardian - Collector Figure",
    customerName: "คุณปกรณ์",
    customerEmail: "pakorn@example.test",
    queuePosition: 1,
    status: "WAITING",
    createdAt: "2026-10-04T10:15:00.000+07:00",
  },
  {
    id: 5,
    productName: "Moonlit City Guardian - Collector Figure",
    customerName: "คุณศิริพร",
    customerEmail: "siriporn@example.test",
    queuePosition: 2,
    status: "WAITING",
    createdAt: "2026-10-05T13:45:00.000+07:00",
  },
  {
    id: 6,
    productName: "Moonlit City - Acrylic Diorama",
    customerName: "คุณธนา",
    customerEmail: "thana@example.test",
    queuePosition: 1,
    status: "OFFERED",
    createdAt: "2026-10-06T09:20:00.000+07:00",
  },
  {
    id: 7,
    productName: "Nendoroid Gojo Satoru",
    customerName: "คุณปาริชาติ",
    customerEmail: "parichat@example.test",
    queuePosition: 3,
    status: "WAITING",
    createdAt: "2026-10-07T16:05:00.000+07:00",
  },
  {
    id: 8,
    productName: "Tower Alchemist - Mini Figure",
    customerName: "คุณวรพล",
    customerEmail: "worapon@example.test",
    queuePosition: 1,
    status: "WAITING",
    createdAt: "2026-10-08T11:40:00.000+07:00",
  },
];

export function getMockWaitlistEntries(): MockWaitlistEntry[] {
  if (typeof window === "undefined") {
    return MOCK_WAITLIST_ENTRIES.map((entry) => ({ ...entry }));
  }
  try {
    const stored = window.localStorage.getItem(MOCK_WAITLIST_STORAGE_KEY);
    if (stored === null) {
      const initialEntries = MOCK_WAITLIST_ENTRIES.map((entry) => ({ ...entry }));
      window.localStorage.setItem(
        MOCK_WAITLIST_STORAGE_KEY,
        JSON.stringify(initialEntries),
      );
      return initialEntries;
    }
    const parsed: unknown = JSON.parse(stored);
    return waitlistEntriesSchema.parse(parsed);
  } catch (error) {
    console.error("Could not read mock waitlist entries.", error);
    throw new Error("อ่านข้อมูลคิว Waitlist ไม่สำเร็จ", { cause: error });
  }
}

export function joinMockWaitlist(input: {
  productId: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  userId?: number;
}): MockWaitlistEntry {
  if (typeof window === "undefined") {
    throw new Error("เข้าคิว Waitlist ได้จากเบราว์เซอร์เท่านั้น");
  }
  const parsedInput = z
    .object({
      productId: z.string().trim().min(1).max(200),
      productName: z.string().trim().min(1).max(200),
      customerName: z.string().trim().min(1).max(150),
      customerEmail: z.string().trim().email().max(254),
      userId: z.number().int().positive().safe().optional(),
    })
    .strict()
    .safeParse(input);
  if (!parsedInput.success) {
    throw new Error(
      parsedInput.error.issues.map((issue) => issue.message).join("; "),
    );
  }
  const entries = getMockWaitlistEntries();
  const duplicate = entries.find(
    (entry) =>
      entry.productId === parsedInput.data.productId &&
      (parsedInput.data.userId !== undefined
        ? entry.userId === parsedInput.data.userId
        : entry.customerEmail.toLowerCase() ===
          parsedInput.data.customerEmail.toLowerCase()),
  );
  if (duplicate) {
    throw new Error("คุณลงชื่อรอสินค้านี้ไว้แล้ว");
  }
  const queuePosition =
    entries.filter(
      (entry) =>
        entry.productId === parsedInput.data.productId &&
        entry.status === "WAITING",
    ).length + 1;
  const newEntry: MockWaitlistEntry = {
    id: Date.now() * 1_000 + Math.floor(Math.random() * 1_000),
    ...parsedInput.data,
    queuePosition,
    status: "WAITING",
    createdAt: new Date().toISOString(),
  };
  const nextEntries = waitlistEntriesSchema.parse([...entries, newEntry]);
  try {
    window.localStorage.setItem(
      MOCK_WAITLIST_STORAGE_KEY,
      JSON.stringify(nextEntries),
    );
    window.dispatchEvent(new CustomEvent(MOCK_WAITLIST_UPDATED_EVENT));
    return newEntry;
  } catch (error) {
    console.error("Could not save mock waitlist entry.", error);
    throw new Error("บันทึกการลงชื่อ Waitlist ไม่สำเร็จ", { cause: error });
  }
}

export function resetMockCommerceData(): void {
  if (typeof window === "undefined") {
    throw new Error("รีเซ็ตข้อมูล Mock ได้จากเบราว์เซอร์เท่านั้น");
  }
  try {
    window.localStorage.removeItem(MOCK_ORDERS_KEY);
    window.localStorage.removeItem(LEGACY_MOCK_ORDERS_KEY);
    window.localStorage.removeItem(MOCK_WAITLIST_STORAGE_KEY);
    window.localStorage.removeItem("manga-collectibles-cart-v1");
    resetAdminProducts();
    window.dispatchEvent(new CustomEvent(MOCK_WAITLIST_UPDATED_EVENT));
  } catch (error) {
    console.error("Could not reset mock commerce data.", error);
    throw new Error("คืนค่าข้อมูล Mock ไม่สำเร็จ", { cause: error });
  }
}
