import { IS_MOCK_MODE } from "../config/env";
import type {
  MockStoredOrder,
  MockShippingAddress,
  MockTaxSummary,
  MockWaitlistEntry,
  MockPaymentRejectionReason,
} from "../mocks/storage.mock";
import {
  listMockOrders,
  getMockOrder,
  saveMockOrder,
  cancelMockOrder,
  rejectMockOrderPayment,
  approveMockOrderPaymentReview,
  advanceMockShipmentStatus,
  markMockOrderShipped,
  getMockWaitlistEntries,
  joinMockWaitlist,
  MOCK_ORDERS_UPDATED_EVENT,
} from "../mocks/storage.mock";

export class OrderService {
  /**
   * Retrieves all orders (or filtered by owner userId).
   */
  static async getOrders(userId?: number): Promise<MockStoredOrder[]> {
    if (IS_MOCK_MODE) {
      return listMockOrders(userId);
    }
    const url = userId ? `/api/orders?userId=${userId}` : "/api/orders";
    const res = await fetch(url);
    if (!res.ok) throw new Error("ไม่สามารถโหลดรายการคำสั่งซื้อได้");
    const data = await res.json();
    return data.orders;
  }

  /**
   * Retrieves a single order by ID.
   */
  static async getOrderById(orderId: number): Promise<MockStoredOrder | null> {
    if (IS_MOCK_MODE) {
      return getMockOrder(orderId);
    }
    const res = await fetch(`/api/orders/${orderId}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error("ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้");
    }
    const data = await res.json();
    return data.order;
  }

  /**
   * Saves or persists a new order.
   */
  static async saveOrder(order: MockStoredOrder): Promise<void> {
    if (IS_MOCK_MODE) {
      saveMockOrder(order);
      return;
    }
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
    if (!res.ok) throw new Error("ไม่สามารถบันทึกคำสั่งซื้อได้");
  }

  /**
   * Cancels an order for a user.
   */
  static async cancelOrder(orderId: number, ownerUserId: number): Promise<MockStoredOrder> {
    if (IS_MOCK_MODE) {
      return cancelMockOrder(orderId, ownerUserId);
    }
    const res = await fetch(`/api/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerUserId }),
    });
    if (!res.ok) throw new Error("ไม่สามารถยกเลิกคำสั่งซื้อได้");
    const data = await res.json();
    return data.order;
  }

  /**
   * Rejects slip verification for an order (Finance).
   */
  static async rejectSlip(orderId: number, reason: MockPaymentRejectionReason): Promise<MockStoredOrder> {
    if (IS_MOCK_MODE) {
      return rejectMockOrderPayment(orderId, reason);
    }
    const res = await fetch(`/api/orders/${orderId}/slip/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error("ไม่สามารถปฏิเสธสลิปได้");
    const data = await res.json();
    return data.order;
  }

  /**
   * Approves slip verification for an order (Finance).
   */
  static async approveSlip(orderId: number): Promise<MockStoredOrder> {
    if (IS_MOCK_MODE) {
      return approveMockOrderPaymentReview(orderId);
    }
    const res = await fetch(`/api/orders/${orderId}/slip/approve`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("ไม่สามารถอนุมัติสลิปได้");
    const data = await res.json();
    return data.order;
  }

  /**
   * Advances packing/shipment status (Staff).
   */
  static async advanceShipment(orderId: number): Promise<MockStoredOrder> {
    if (IS_MOCK_MODE) {
      return advanceMockShipmentStatus(orderId);
    }
    const res = await fetch(`/api/orders/${orderId}/shipment/advance`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("ไม่สามารถอัปเดตสถานะการจัดส่งได้");
    const data = await res.json();
    return data.order;
  }

  /**
   * Marks an order as shipped with carrier tracking (Staff).
   */
  static async markOrderShipped(
    orderId: number,
    carrier: "FLASH" | "THAI_POST" = "FLASH",
  ): Promise<MockStoredOrder> {
    if (IS_MOCK_MODE) {
      return markMockOrderShipped(orderId, carrier);
    }
    const res = await fetch(`/api/orders/${orderId}/shipment/ship`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carrier }),
    });
    if (!res.ok) throw new Error("ไม่สามารถอัปเดตสถานะจัดส่งได้");
    const data = await res.json();
    return data.order;
  }

  /**
   * Retrieves orders requesting e-Tax invoice.
   */
  static async getETaxOrders(): Promise<MockStoredOrder[]> {
    const all = await this.getOrders();
    return all.filter((o) => o.taxSummary?.taxInvoiceRequested);
  }
}
