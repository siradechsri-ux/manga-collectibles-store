# เอกสารการวิเคราะห์และออกแบบระบบ (System Analysis and Design Document - SA)
## โครงการ: Manga & Collectibles E-Commerce Platform (ระบบร้านค้าออนไลน์จำหน่ายมังงะและฟิกเกอร์ของสะสม)

---

### ข้อมูลเอกสาร (Document Metadata)
* **ชื่อโครงการ:** Manga & Collectibles Store Platform
* **รหัสโครงการ:** MCS-SA-2026-V1
* **เวอร์ชันเอกสาร:** Version 1.0 (สมบูรณ์)
* **สถานะ:** เอกสารผ่านการวิเคราะห์และตรวจสอบทางเทคนิค (Approved / Architecture Baseline)
* **กลุ่มเป้าหมายผู้อ่าน:** System Analyst, Software Engineer, Database Administrator, Product Owner, QA Engineer

---

## สารบัญ (Table of Contents)
1. [บทนำและภาพรวมของระบบ (Introduction & System Overview)](#1-บทนำและภาพรวมของระบบ-introduction--system-overview)
2. [การวิเคราะห์ผู้ใช้งานและสิทธิ์ในระบบ (User Personas & Role-Based Access Control)](#2-การวิเคราะห์ผู้ใช้งานและสิทธิ์ในระบบ-user-personas--role-based-access-control)
3. [ความต้องการของระบบ (System Requirements)](#3-ความต้องการของระบบ-system-requirements)
   - 3.1 ความต้องการเชิงหน้าที่ (Functional Requirements)
   - 3.2 ความต้องการที่มิใช่เชิงหน้าที่ (Non-Functional Requirements)
4. [สถาปัตยกรรมระบบ (System Architecture & Technology Stack)](#4-สถาปัตยกรรมระบบ-system-architecture--technology-stack)
5. [การวิเคราะห์และออกแบบฐานข้อมูล (Database Design & Data Dictionary)](#5-การวิเคราะห์และออกแบบฐานข้อมูล-database-design--data-dictionary)
6. [โฟลว์การทำงานและลำดับกระบวนการ (Core Business Workflows & Sequence Diagrams)](#6-โฟลว์การทำงานและลำดับกระบวนการ-core-business-workflows--sequence-diagrams)
   - 6.1 Unified Mixed Checkout & Split Shipping
   - 6.2 Automated Slip Verification & Anti-Double-Spending
   - 6.3 Preorder Deposit, Arrival, Balance Settlement & Forfeiture
   - 6.4 Figure Waitlist Queue & Auto-Allocation
   - 6.5 e-Tax Invoice & Mixed VAT Calculation (RD Compliance)
   - 6.6 Ichiban Kuji Online Lottery Box & Last One Prize
7. [ข้อกำหนดส่วนต่อประสานโปรแกรมประยุกต์ (API Specification & Contracts)](#7-ข้อกำหนดส่วนต่อประสานโปรแกรมประยุกต์-api-specification--contracts)
8. [ความมั่นคงปลอดภัยและการจัดการข้อผิดพลาด (Security & Error Handling)](#8-ความมั่นคงปลอดภัยและการจัดการข้อผิดพลาด-security--error-handling)
9. [การติดตั้ง สภาพแวดล้อม และงานเบื้องหลัง (Deployment & Scheduled Tasks)](#9-การติดตั้ง-สภาพแวดล้อม-และงานเบื้องหลัง-deployment--scheduled-tasks)

---

## 1. บทนำและภาพรวมของระบบ (Introduction & System Overview)

### 1.1 ที่มาและความสำคัญ (Background)
ธุรกิจร้านค้ามังงะและของเล่นของสะสม (Collectibles / Figures) ในประเทศไทย มีลักษณะเฉพาะตัวทางธุรกิจที่แตกต่างจากแพลตฟอร์มอีคอมเมิร์ซสินค้าทั่วไปอย่างมาก ได้แก่:
1. **การจำหน่ายสินค้ารวมประเภท (Mixed Inventory):** ลูกค้ามักสั่งซื้อหนังสือการ์ตูนพร้อมส่ง (In-Stock Manga) ควบคู่กับฟิกเกอร์เปิดรับจองล่วงหน้า (Preorder Figures) ซึ่งมีวันวางจำหน่ายต่างกันหลายเดือน
2. **ระบบการวางมัดจำ (Deposit Settlement):** ฟิกเกอร์สเกลราคาสูงจำเป็นต้องเปิดรับมัดจำบางส่วน (Deposit) และจัดเก็บเงินส่วนที่เหลือ (Balance) เมื่อสินค้าเดินทางมาถึงคลังไทย (Arrived in Warehouse) ภายในกรอบเวลาที่กำหนด (7 วัน)
3. **การคำนวณค่าจัดส่งตามปริมาตรกล่อง (Volumetric Weight):** ฟิกเกอร์มีกล่องขนาดใหญ่แต่น้ำหนักเบา จำเป็นต้องคิดค่าส่งจากน้ำหนักเชิงปริมาตรเปรียบเทียบกับน้ำหนักชั่งจริง
4. **ความซับซ้อนทางภาษีมูลค่าเพิ่ม (VAT Separation):** ตามประมวลรัษฎากร มาตรา 81(1)(ช) หนังสือและมังงะได้รับการยกเว้นภาษีมูลค่าเพิ่ม (VAT Exempt) ในขณะที่ฟิกเกอร์ ของสะสม และค่าบริการขนส่ง ต้องเสียภาษีมูลค่าเพิ่ม 7% (VAT 7%)
5. **การป้องกันทุจริตสลิปโอนเงิน (Anti-Fraud Slip Verification):** การโอนผ่าน PromptPay ธนาคารไทยต้องตรวจสอบความถูกต้องแบบเรียลไทม์ และป้องกันการนำสลิปเดิมมาใช้ซ้ำ (Double-spending)
6. **ระบบคิวสำรองสิทธิ์ (Waitlist):** เมื่อลูกค้าที่มัดจำไม่มาชำระยอดที่เหลือภายในกำหนด ต้องมีการริบเงินมัดจำและนำโควตานั้นส่งต่อให้ลูกค้าในคิวสำรองแบบอัตโนมัติ

### 1.2 วัตถุประสงค์ (Objectives)
* พัฒนาระบบร้านค้าออนไลน์ครบวงจรที่รองรับการ Checkout สินค้าแบบผสม (Mixed Cart) ได้อย่างราบรื่น
* สร้างกลไกควบคุมสถานะคำสั่งซื้อและยอดเงินมัดจำ (Deposit & Balance Lifecycle) ที่ปลอดภัยและเป็นระบบอัตโนมัติ
* ป้องกันข้อผิดพลาดทางการเงินและภาษี ด้วยระบบคำนวณภาษีแยกหมวดหมู่และออกใบกำกับภาษีอิเล็กทรอนิกส์ (e-Tax Invoice) มาตรฐานกรมสรรพากร
* ยกระดับประสบการณ์ผู้ใช้งานด้วยระบบแจ้งเตือนผ่าน LINE Official Account / Email และกิจกรรมส่งเสริมการขาย เช่น สุ่มจับสลากอิชิบังกุจิ (Ichiban Kuji) และระบบแต้มสะสมสมาชิก (Loyalty Points)

### 1.3 ขอบเขตของโครงการ (Project Scope)
* **Frontend:** เว็บแอปพลิเคชันแบบ Responsive ทำงานได้บนมือถือและเดสก์ท็อป รองรับ Dark/Light Mode และการเปลี่ยนภาษา (i18n: TH/EN)
* **Backend:** RESTful API Server ควบคุม Business Logic การทำธุรกรรม (ACID Transactions) และระบบประมวลผลงานเบื้องหลัง (Background Worker / Cron Jobs)
* **Database:** ระบบฐานข้อมูลเชิงสัมพันธ์ PostgreSQL สำหรับจัดเก็บโครงสร้างข้อมูลและประวัติธุรกรรม พร้อม Redis สำหรับ Caching
* **Third-Party Integrations:** ธนาคาร/ผู้ให้บริการตรวจสลิป (OpenSlipVerify / SlipOK), LINE Messaging API, Resend Email API, และระบบจัดทำเอกสาร PDF ใบกำกับภาษี

---

## 2. การวิเคราะห์ผู้ใช้งานและสิทธิ์ในระบบ (User Personas & Role-Based Access Control)

ระบบกำหนดบทบาทผู้ใช้งาน (User Roles) ออกเป็น 4 ระดับ เพื่อจำกัดสิทธิ์ตามหลัก Least Privilege:

```mermaid
graph TD
    User([ผู้ใช้งานทั้งหมด]) --> Customer[CUSTOMER: ลูกค้าทั่วไป]
    User --> Staff[STAFF: เจ้าหน้าที่คลังสินค้า]
    User --> Finance[FINANCE: เจ้าหน้าที่ฝ่ายการเงิน]
    User --> Admin[ADMIN: ผู้ดูแลระบบสูงสุด]

    Customer --> C1[เลือกดูสินค้า สั่งซื้อ จองพรีออเดอร์]
    Customer --> C2[แนบสลิปชำระเงิน / ชำระค่างวดที่เหลือ]
    Customer --> C3[ขอรับสิทธิ์ Waitlist และเล่น Ichiban Kuji]
    Customer --> C4[ดาวน์โหลดใบกำกับภาษี e-Tax]

    Staff --> S1[ตรวจสอบคำสั่งซื้อที่พร้อมแพ็ค Ready to Pack]
    Staff --> S2[อัปเดตสถานะฟิกเกอร์เข้าคลัง Arrived in Warehouse]
    Staff --> S3[บันทึกเลขพัสดุ Flash / ไปรษณีย์ไทย]

    Finance --> F1[ตรวจสอบสลิปที่ระบบตรวจไม่ผ่าน Manual Review]
    Finance --> F2[ตรวจสอบรายงานภาษีขาย VAT 7% และยกเว้น VAT]
    Finance --> F3[อนุมัติหรือยกเลิกใบกำกับภาษี e-Tax Invoice]

    Admin --> A1[จัดการแคตตาล็อก มังงะ ฟิกเกอร์ ซีรีส์ ผู้ผลิต]
    Admin --> A2[ตั้งค่าตู้สลาก Ichiban Kuji และรางวัล Last One]
    Admin --> A3[จัดการอัตราค่าส่ง สิทธิ์ผู้ใช้ และตั้งค่าระบบ]
```

### ตารางเมทริกซ์สิทธิ์การใช้งาน (RBAC Permission Matrix)

| ความสามารถของระบบ (Feature / Capability) | Customer | Staff (คลัง) | Finance (การเงิน) | Admin (แอดมิน) |
| :--- | :---: | :---: | :---: | :---: |
| ค้นหา/เปิดดูสินค้า แคตตาล็อก และปฏิทินวางจำหน่าย | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| สั่งซื้อสินค้า ชำระเงินมัดจำ และชำระยอดคงเหลือ | :white_check_mark: | :x: | :x: | :x: |
| ลงชื่อคิวสำรองสินค้าพรีออเดอร์ (Waitlist) | :white_check_mark: | :x: | :x: | :x: |
| เข้าร่วมเล่นตู้สลากออนไลน์ Ichiban Kuji | :white_check_mark: | :x: | :x: | :x: |
| ตรวจสอบประวัติคำสั่งซื้อและดาวน์โหลด e-Tax Invoice ของตนเอง | :white_check_mark: | :x: | :x: | :x: |
| อัปเดตสถานะสินค้าเข้าคลัง (Mark Figure Arrived) | :x: | :white_check_mark: | :x: | :white_check_mark: |
| ดูรายการสินค้าที่รอการแพ็คและพิมพ์ใบแปะหน้าพัสดุ (Packing List) | :x: | :white_check_mark: | :x: | :white_check_mark: |
| บันทึกการส่งพัสดุและเลข Tracking Number | :x: | :white_check_mark: | :x: | :white_check_mark: |
| ตรวจสอบสลิปโอนเงินที่ต้องยืนยันมือ (Manual Review) | :x: | :x: | :white_check_mark: | :white_check_mark: |
| ตรวจสอบและดาวน์โหลดรายงานใบกำกับภาษีทั้งหมด | :x: | :x: | :white_check_mark: | :white_check_mark: |
| เพิ่ม/แก้ไข/ระงับสินค้า ราคา สต็อก และโควตาพรีออเดอร์ | :x: | :x: | :x: | :white_check_mark: |
| รีเซ็ตหรือเติมรางวัลในตู้สลาก Ichiban Kuji | :x: | :x: | :x: | :white_check_mark: |
| จัดการสิทธิ์ผู้ใช้งานในระบบและตั้งค่าระบบร้านค้า | :x: | :x: | :x: | :white_check_mark: |

---

## 3. ความต้องการของระบบ (System Requirements)

### 3.1 ความต้องการเชิงหน้าที่ (Functional Requirements - FR)

#### หมวดที่ 1: การจัดการสินค้าและแคตตาล็อก (Catalog & Product Management)
* **FR-1.1:** ระบบต้องรองรับสินค้า 2 ประเภทหลัก ได้แก่ มังงะ (`MANGA`) และฟิกเกอร์ (`FIGURE`)
* **FR-1.2:** สินค้าประเภทมังงะต้องผูกกับสำนักพิมพ์ (`Publisher`), ซีรีส์การ์ตูน (`MangaSeries`), และระบุเล่มที่ (`volumeNumber`)
* **FR-1.3:** สินค้าประเภทฟิกเกอร์ต้องมีข้อมูลจำเพาะ (`FigureMetadata`) ได้แก่ ผู้ผลิต (`Manufacturer`), ตัวละคร (`Character`), สเกลความสูง (`scale`, `heightMm`), รหัสบาร์โค้ดสากล (`janCode`), ขนาดกล่องบรรจุภัณฑ์ (`boxWidthCm`, `boxLengthCm`, `boxHeightCm`) และน้ำหนักจริง (`actualWeightKg`)
* **FR-1.4:** ระบบต้องรองรับการกำหนด Variant สินค้า เช่น ฉบับปกติ (Regular), ฉบับพิเศษ (Special Set), ปกรองรับงานอีเวนต์ โดยมี SKU และสต็อกแยกกัน

#### หมวดที่ 2: ระบบตะกร้าและการสั่งซื้อรวม (Unified Mixed Cart & Checkout)
* **FR-2.1:** ลูกค้าสามารถรวมสินค้ามังงะพร้อมส่ง และฟิกเกอร์ที่เปิดพรีออเดอร์ในตะกร้าเดียวกันได้
* **FR-2.2:** สินค้าพรีออเดอร์ต้องเลือกรูปแบบการชำระได้ 2 แบบ คือ ชำระเต็มจำนวน (`FULL`) หรือ จ่ายเฉพาะค่ามัดจำ (`DEPOSIT`)
* **FR-2.3:** ระบบต้องคำนวณยอดเงินที่ต้องชำระทันที (`immediateAmount`) ซึ่งประกอบด้วย: (ราคามังงะพร้อมส่ง + ค่ามัดจำ/ราคาเต็มฟิกเกอร์ + ค่าจัดส่งรอบแรก) และคำนวณยอดคงค้าง (`remainingBalanceAmount`) ที่ต้องรอเก็บเมื่อสินค้ามาถึง
* **FR-2.4:** นโยบายการจัดส่ง (Shipping Policy): รองรับการแยกส่ง (Split Shipment) เพื่อส่งสินค้าพร้อมส่งทันที และส่งฟิกเกอร์ตามไปเมื่อมาถึง หรือส่งรวมกันเมื่อสินค้าครบ

#### หมวดที่ 3: การคำนวณค่าจัดส่ง (Volumetric & Weight Calculation)
* **FR-3.1:** การคำนวณน้ำหนักที่คิดค่าบริการ (Billable Weight) ของฟิกเกอร์ ต้องเปรียบเทียบระหว่าง:
  $$\text{Dimensional Weight (kg)} = \frac{\text{Width (cm)} \times \text{Length (cm)} \times \text{Height (cm)}}{5,000}$$
  กับ น้ำหนักชั่งจริง ($\text{Actual Weight}$) โดยเลือกค่าที่มากกว่าเป็นน้ำหนักคิดราคา
* **FR-3.2:** ระบบต้องคำนวณค่าส่งตามขั้นบันไดน้ำหนักจริงของผู้ให้บริการขนส่ง เช่น Flash Express (`FLASH`) และ ไปรษณีย์ไทย (`THAI_POST`) ตามตาราง `shipping_rates`

#### หมวดที่ 4: การชำระเงินและตรวจสอบสลิป (Payment & Slip Verification)
* **FR-4.1:** ระบบต้องสร้าง PromptPay QR Code มาตรฐาน EMVCo พร้อมระบุจำนวนเงินที่ต้องชำระแบบตรงยอด
* **FR-4.2:** เมื่อลูกค้าอัปโหลดสลิปโอนเงิน ระบบต้องสกัดข้อมูล QR Payload/Transaction Reference และคำนวณค่า SHA-256 Hash ของสลิปเพื่อบันทึกลงในตาราง `bank_slips`
* **FR-4.3:** ระบบต้องปฏิเสธสลิปทันทีหากพบว่าค่า Hash หรือ Transaction Reference ซ้ำในระบบ (ป้องกันการโอนครั้งเดียวแต่เคลมหลายคำสั่งซื้อ)
* **FR-4.4:** ระบบต้องตรวจสอบว่ายอดเงินในสลิปตรงกับยอดที่เรียกเก็บ และบัญชีปลายทางตรงกับบัญชีร้านค้า

#### หมวดที่ 5: สินค้าพรีออเดอร์และการตัดยอดมัดจำ (Preorder & Balance Settlement)
* **FR-5.1:** เมื่อเจ้าหน้าที่บันทึกว่าฟิกเกอร์มาถึงคลัง (`ARRIVED_IN_WAREHOUSE`) ระบบต้องเปลี่ยนสถานะรายการมัดจำเป็น `AWAITING_BALANCE_PAYMENT` และคำนวณวันหมดเขตชำระเงินภายใน 7 วัน (`balanceDueDate = arrivedAt + 7 days`)
* **FR-5.2:** ระบบต้องส่งข้อความแจ้งเตือนลูกค้าผ่าน LINE / Email พร้อมลิงก์สำหรับกดชำระยอดที่เหลือ
* **FR-5.3:** หากลูกค้าไม่ชำระเงินภายในเวลา 7 วัน ระบบจะทำการ **ริบเงินมัดจำ (Forfeit Deposit)** เปลี่ยนสถานะเป็น `DEPOSIT_FORFEITED` โดยไม่มีการคืนเงินมัดจำ

#### หมวดที่ 6: ระบบคิวสำรองสินค้าพรีออเดอร์ (Waitlist Queue Allocation)
* **FR-6.1:** เมื่อโควตาพรีออเดอร์เต็ม ลูกค้าสามารถกดลงทะเบียน Waitlist เพื่อรับสิทธิ์สำรองตามลำดับคิว (FIFO: First-In, First-Out)
* **FR-6.2:** เมื่อมีโควตาหลุดจากการที่ลูกค้าเดิมถูกริบมัดจำ หรือมีการยกเลิก ระบบ Worker ต้องดึงคิวแรก (`queue_position = 1`) และเปลี่ยนสถานะเป็น `OFFERED` พร้อมสร้าง Token พิเศษ (`claim_token`)
* **FR-6.3:** ระบบจะสงวนสิทธิ์ให้คิวแรกชำระเงินภายใน 48 ชั่วโมง หากไม่ชำระจะถือว่าสละสิทธิ์ (`EXPIRED`) และส่งต่อสิทธิ์ให้คิวลำดับถัดไปทันที

#### หมวดที่ 7: ใบกำกับภาษีอิเล็กทรอนิกส์เต็มรูปแบบ (e-Tax Invoice by Email)
* **FR-7.1:** ลูกค้าสามารถระบุความประสงค์ขอรับใบกำกับภาษีเต็มรูปแบบได้ในขั้นตอน Checkout โดยเลือกระหว่างบุคคลธรรมดา (ระบุเลขบัตรประชาชน 13 หลัก) หรือนิติบุคคล (ระบุเลขประจำตัวผู้เสียภาษี 13 หลัก พร้อมสาขา 5 หลัก)
* **FR-7.2:** ระบบต้องตรวจสอบความถูกต้องของเลขประจำตัวผู้เสียภาษี 13 หลักด้วยอัลกอริทึม Modulo 11 Checksum
* **FR-7.3:** การคำนวณภาษีต้องแยกยอดสินค้าที่ได้รับการยกเว้นภาษี (มังงะ/ไลท์โนเวล) ออกจากยอดสินค้าที่คิดภาษี 7% (ฟิกเกอร์/ค่าจัดส่ง) ตามข้อกำหนดกรมสรรพากร
* **FR-7.4:** ระบบต้องสร้างไฟล์ PDF ใบกำกับภาษีภาษาไทยด้วยฟอนต์มาตรฐานสารบรรณ (Sarabun) และส่งอีเมลพร้อมแนบไฟล์ให้ลูกค้าโดยอัตโนมัติ

#### หมวดที่ 8: กิจกรรมส่งเสริมการขาย (Loyalty Points & Ichiban Kuji)
* **FR-8.1:** ระบบสมาชิกคำนวณระดับตามยอดสะสมแต้ม (Member, Silver, Gold, Platinum) และให้สิทธิประโยชน์ส่วนลดแตกต่างกัน
* **FR-8.2:** ระบบตู้สลากออนไลน์ Ichiban Kuji จำลองการจับฉลากแบบเรียลไทม์ ตรวจสอบสิทธิ์และจำนวนคงเหลือในตู้ (Box Stock) พร้อมกลไกมอบรางวัลพิเศษ **Last One Prize** สำหรับผู้ที่ดึงตั๋วใบสุดท้ายในกล่อง

---

### 3.2 ความต้องการที่มิใช่เชิงหน้าที่ (Non-Functional Requirements - NFR)

* **NFR-1 (Security & Integrity):** รหัสผ่านของผู้ใช้งานต้องถูกเข้ารหัสด้วย bcrypt ด้วย Salt Rounds ไม่ต่ำกว่า 10 รอบ และ Session การทำงานต้องใช้ JWT Token ที่แนบใน Secure HttpOnly Cookie
* **NFR-2 (Concurrency & Data Consistency):** การตัดสต็อกสินค้า การหักโควตาพรีออเดอร์ และการดึงสลาก Kuji ต้องใช้ Database Row-Level Locking (`SELECT FOR UPDATE`) ภายใต้ ACID Database Transaction เพื่อป้องกันปัญหาขายเกินสต็อก (Overselling / Race Conditions)
* **NFR-3 (Performance):** หน้าเว็บแคตตาล็อกสินค้าต้องตอบสนองด้วยเวลาเฉลี่ย (First Contentful Paint) ต่ำกว่า 1.5 วินาที และ API Response Time ของระบบ Checkout ต้องต่ำกว่า 800 ms ที่ระดับ 100 concurrent requests
* **NFR-4 (Idempotency):** API ยืนยันการชำระเงินและการตัดยอดคงเหลือต้องรองรับ Idempotency Key เพื่อป้องกันการหักเงินซ้ำกรณีที่มีการส่ง Request ซ้ำซ้อนจากเครือข่ายหลุด
* **NFR-5 (Tax Law Compliance):** รูปแบบใบกำกับภาษีและการคำนวณยอดต้องถูกต้องตามระเบียบกรมสรรพากรแห่งประเทศไทย 100%

---

## 4. สถาปัตยกรรมระบบ (System Architecture & Technology Stack)

ระบบถูกออกแบบด้วยสถาปัตยกรรมแบบ **Modern Full-Stack Decoupled Architecture** ผสมผสานระหว่าง Frontend Client-Side Rendering/Server Component และ Backend API Services พร้อมระบบ Worker ในการประมวลผลงานเบื้องหลัง

```mermaid
graph TB
    subgraph ClientLayer["🖥️ Client Presentation Layer"]
        WebUser["🌐 Customer Browser<br/>(Desktop / Mobile)"]
        BackofficeUser["💼 Staff / Finance / Admin<br/>(Backoffice UI)"]
    end

    subgraph FrontendApp["⚡ Next.js 16 Web Application (Port 3000)"]
        NextRouter["App Router & Middleware<br/>(i18n / Session Guard)"]
        ReactUI["React 19 Components<br/>(Tailwind CSS & Lucide)"]
        ClientContext["Context Providers<br/>(Auth / Cart / Theme)"]
    end

    subgraph BackendAPI["🚀 Express API Application (Port 4000)"]
        ExpressApp["Express Server & Middlewares<br/>(CORS / CookieParser / AuthToken)"]
        
        subgraph Controllers["API Controllers & Services"]
            AuthCtrl["Auth Service<br/>(JWT / bcrypt)"]
            CatalogCtrl["Catalog Service<br/>(Manga & Figure Query)"]
            CheckoutCtrl["Unified Checkout Service<br/>(Mixed Cart Engine)"]
            SlipCtrl["Slip Verification Service<br/>(SHA-256 Anti-Fraud)"]
            BalanceCtrl["Balance Settlement Service<br/>(7-Day Grace Period)"]
            WaitlistCtrl["Waitlist Service & Worker<br/>(Auto Re-allocation)"]
            TaxCtrl["Tax Invoice Service<br/>(PDFKit / Mod 11 Check)"]
            KujiCtrl["Ichiban Kuji Service<br/>(Live Ticket State)"]
        end
    end

    subgraph WorkerLayer["⏱️ Background Workers & Cron Jobs"]
        ForfeitureCron["Balance Forfeiture Cron<br/>(Runs Daily at 00:00)"]
        WaitlistWorker["Waitlist Expiration Worker<br/>(Runs Every 10 Mins)"]
    end

    subgraph PersistenceLayer["💾 Data Persistence Layer"]
        PostgresDB[("🐘 PostgreSQL 16<br/>Relational Database")]
        RedisStore[("⚡ Redis 7<br/>Session & Caching")]
        FileStorage[("📁 Local / S3 Storage<br/>(PDF Tax Invoices & Uploads)")]
    end

    subgraph ExternalServices["🌍 External Services & APIs"]
        SlipProvider["🏦 Slip Verification Provider<br/>(OpenSlipVerify / Bank API)"]
        LineNotify["💬 LINE Messaging API<br/>(Push Message Notifications)"]
        ResendMail["📧 Resend Email Service<br/>(Order Confirm & e-Tax PDF)"]
    end

    WebUser --> NextRouter
    BackofficeUser --> NextRouter
    NextRouter --> ReactUI
    ReactUI --> ClientContext
    ClientContext -->|REST API Calls /api/*| ExpressApp

    ExpressApp --> Controllers
    Controllers --> PostgresDB
    Controllers --> RedisStore
    TaxCtrl --> FileStorage

    ForfeitureCron --> BalanceCtrl
    WaitlistWorker --> WaitlistCtrl

    SlipCtrl --> SlipProvider
    CheckoutCtrl --> LineNotify
    BalanceCtrl --> LineNotify
    TaxCtrl --> ResendMail
```

### รายละเอียด Technology Stack

| ชั้นสถาปัตยกรรม (Layer) | เทคโนโลยีที่เลือกใช้ | บทบาทและหน้าที่ (Responsibility) |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 16 (App Router) + React 19** | ระบบจัดการหน้าเว็บ, Routing แบบแบ่งภาษา (i18n), Server/Client Components |
| **Styling & Icons** | **Tailwind CSS v4 + Lucide React** | การออกแบบ UI สวยงามตามหลัก Modern UI, รองรับ Responsive และ Dark Theme |
| **Backend Runtime** | **Node.js (v20+) + TypeScript + TSX** | การประมวลผลเซิร์ฟเวอร์แบบ Typesafe และรวดเร็ว |
| **API Framework** | **Express.js v5** | การจัดการ RESTful Routing, Middleware ตรวจสอบสิทธิ์ และ Error Handling |
| **Database & ORM** | **PostgreSQL 16 + Prisma ORM + `pg` Pool** | ฐานข้อมูลเชิงสัมพันธ์ระดับองค์กร พร้อม Connection Pooling ที่มีประสิทธิภาพสูง |
| **Validation Library** | **Zod v4** | การตรวจสอบโครงสร้างข้อมูล Request/Response (Schema Validation) ทั้งระบบ |
| **Authentication** | **JWT (jsonwebtoken) + bcryptjs** | การออก Token บันทึกข้อมูลสิทธิ์ และการเข้ารหัสความปลอดภัยรหัสผ่าน |
| **Document Generator**| **PDFKit + Sarabun Font + Thai Baht Text** | สร้างใบเสร็จ/ใบกำกับภาษีภาษาไทยตามมาตรฐานทางราชการอย่างแม่นยำ |
| **Payment Integration**| **promptpay-qr + qrcode** | สร้าง QR Code พร้อมเพย์ตามมาตรฐาน EMVCo |
| **Job Scheduling** | **node-cron** | จัดการงาน Background อัตโนมัติ (ริบมัดจำและส่งต่อคิว Waitlist) |

---

## 5. การวิเคราะห์และออกแบบฐานข้อมูล (Database Design & Data Dictionary)

### 5.1 ผังความสัมพันธ์ข้อมูล (Entity-Relationship Diagram - ERD)

```mermaid
erDiagram
    users ||--o{ orders : "places"
    users ||--o{ product_waitlists : "joins"
    users ||--o{ tax_invoices : "requests"
    
    publishers ||--o{ manga_series : "publishes"
    publishers ||--o{ products : "owns"
    manga_series ||--o{ products : "contains"
    
    products ||--|{ product_variants : "has"
    products ||--o| figures_metadata : "has metadata"
    
    manufacturers ||--o{ figures_metadata : "manufactures"
    characters ||--o{ figures_metadata : "depicts"
    
    product_variants ||--o| preorders : "has schedule"
    product_variants ||--o{ order_items : "sold as"
    product_variants ||--o{ product_waitlists : "queued for"
    
    orders ||--|{ order_items : "contains"
    orders ||--o{ bank_slips : "verified by"
    orders ||--o| tax_invoices : "generates"

    shipping_rates {
        bigint id PK
        enum carrier
        varchar service_area_code
        numeric min_billable_weight_kg
        numeric max_billable_weight_kg
        numeric shipping_fee
    }

    users {
        int id PK
        varchar email UK
        varchar password_hash
        varchar full_name
        varchar phone_number
        enum role
        varchar line_user_id UK
    }

    products {
        bigint id PK
        varchar slug UK
        varchar name
        varchar product_type
        int volume_number
        bigint publisher_id FK
        bigint series_id FK
    }

    product_variants {
        bigint id PK
        bigint product_id FK
        varchar option_name
        varchar sku UK
        numeric price
        int stock_quantity
        numeric weight_grams
        varchar availability_status
    }

    figures_metadata {
        bigint product_id PK,FK
        bigint manufacturer_id FK
        bigint character_id FK
        varchar scale
        numeric box_width_cm
        numeric box_length_cm
        numeric box_height_cm
        numeric actual_weight_kg
        varchar warehouse_status
        timestamptz arrived_at
    }

    preorders {
        bigint product_variant_id PK,FK
        timestamptz start_date
        timestamptz end_date
        bigint quota_limit
        bigint booked_count
        numeric deposit_amount
        numeric full_price
        enum release_status
    }

    orders {
        bigint id PK
        int user_id FK
        varchar order_number UK
        numeric total_amount
        numeric immediate_amount
        numeric remaining_balance_amount
        numeric shipping_fee
        varchar order_status
        varchar payment_status
        varchar settlement_status
        timestamptz balance_due_date
    }

    order_items {
        bigint id PK
        bigint order_id FK
        bigint product_variant_id FK
        int quantity
        numeric unit_price
        numeric balance_amount
        varchar payment_type
        varchar settlement_status
    }

    bank_slips {
        bigint id PK
        bigint order_id FK
        varchar payment_stage
        varchar transaction_ref UK
        char slip_hash UK
        numeric transfer_amount
        timestamptz transferred_at
    }

    product_waitlists {
        bigint id PK
        bigint product_variant_id FK
        int user_id FK
        bigint queue_position
        enum status
        uuid claim_token
        timestamptz offer_expires_at
    }

    tax_invoices {
        bigint id PK
        bigint order_id UK,FK
        int user_id FK
        varchar invoice_number UK
        enum entity_type
        char tax_id
        varchar company_or_name
        numeric non_vat_amount
        numeric vatable_amount
        numeric vat_amount
        numeric total_amount
    }
```

### 5.2 พจนานุกรมข้อมูล (Data Dictionary)

#### 1. ตาราง `users` (ข้อมูลผู้ใช้งาน)
| ชื่อคอลัมน์ (Field) | ชนิดข้อมูล (Data Type) | ข้อกำหนด (Constraints) | คำอธิบาย (Description) |
| :--- | :--- | :--- | :--- |
| `id` | `INT` | PK, Auto Increment | รหัสผู้ใช้งาน |
| `email` | `VARCHAR(255)` | Unique, Not Null | อีเมลสำหรับ Login |
| `password_hash` | `VARCHAR(255)` | Not Null | รหัสผ่านที่เข้ารหัสด้วย bcrypt |
| `full_name` | `VARCHAR(150)` | Not Null | ชื่อ-นามสกุลจริง |
| `phone_number` | `VARCHAR(20)` | Nullable | เบอร์โทรศัพท์ติดต่อ |
| `role` | `ENUM('user_role')` | Default 'CUSTOMER' | สิทธิ์: CUSTOMER, STAFF, FINANCE, ADMIN |
| `is_active` | `BOOLEAN` | Default TRUE | สถานะเปิดใช้งานบัญชี |
| `line_user_id` | `VARCHAR(100)` | Unique, Nullable | LINE User ID สำหรับรับการแจ้งเตือน |
| `created_at` | `TIMESTAMPTZ` | Default NOW() | วันเวลาที่สร้างบัญชี |

#### 2. ตาราง `products` (สินค้าหลัก)
| ชื่อคอลัมน์ (Field) | ชนิดข้อมูล (Data Type) | ข้อกำหนด (Constraints) | คำอธิบาย (Description) |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | PK, Identity | รหัสสินค้า |
| `slug` | `VARCHAR(300)` | Unique, Not Null | Slug URL ประจำสินค้า |
| `name` | `VARCHAR(300)` | Not Null | ชื่อสินค้าภาษาไทย/อังกฤษ |
| `product_type` | `VARCHAR(20)` | Check in ('MANGA', 'FIGURE') | ประเภทสินค้า |
| `volume_number` | `INTEGER` | Nullable (Mandatory for Manga)| เล่มที่ (เฉพาะมังงะ) |
| `publisher_id` | `BIGINT` | FK -> publishers.id | ผู้จัดพิมพ์ (เฉพาะมังงะ) |
| `series_id` | `BIGINT` | FK -> manga_series.id | ซีรีส์การ์ตูน (เฉพาะมังงะ) |
| `is_active` | `BOOLEAN` | Default TRUE | สถานะแสดงผลสินค้า |

#### 3. ตาราง `product_variants` (รายการย่อยสินค้า)
| ชื่อคอลัมน์ (Field) | ชนิดข้อมูล (Data Type) | ข้อกำหนด (Constraints) | คำอธิบาย (Description) |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | PK, Identity | รหัสรายการย่อยสินค้า |
| `product_id` | `BIGINT` | FK -> products.id | รหัสสินค้าหลัก |
| `option_name` | `VARCHAR(150)` | Not Null | ชื่อตัวเลือก (เช่น ฉบับปกติ, Special Set) |
| `sku` | `VARCHAR(100)` | Unique, Nullable | รหัสสินค้าควบคุมสต็อก (SKU) |
| `price` | `NUMERIC(12,2)` | Not Null, Check > 0 | ราคาขาย (บาท) |
| `stock_quantity` | `INTEGER` | Default 0, Check >= 0 | จำนวนสินค้าคงเหลือพร้อมส่ง |
| `weight_grams` | `NUMERIC(10,2)` | Check > 0 | น้ำหนักสุทธิของสินค้า (กรัม) |
| `availability_status`| `VARCHAR(24)` | Default 'IN_STOCK' | สถานะ: IN_STOCK, OUT_OF_STOCK, PREORDER_CLOSED |

#### 4. ตาราง `figures_metadata` (ข้อมูลจำเพาะฟิกเกอร์)
| ชื่อคอลัมน์ (Field) | ชนิดข้อมูล (Data Type) | ข้อกำหนด (Constraints) | คำอธิบาย (Description) |
| :--- | :--- | :--- | :--- |
| `product_id` | `BIGINT` | PK, FK -> products.id | รหัสสินค้าหลัก |
| `manufacturer_id` | `BIGINT` | FK -> manufacturers.id | ค่ายผู้ผลิต (Good Smile, Alter ฯลฯ) |
| `character_id` | `BIGINT` | FK -> characters.id | ตัวละคร |
| `scale` | `VARCHAR(100)` | Not Null | สเกล (เช่น 1/7, Non-Scale, Nendoroid) |
| `jan_code` | `VARCHAR(13)` | Nullable | รหัส JAN Barcode 13 หลักของญี่ปุ่น |
| `box_width_cm` | `NUMERIC(8,2)` | Nullable | ความกว้างของกล่อง (ซม.) สำหรับคิดน้ำหนักตามขนาด |
| `box_length_cm` | `NUMERIC(8,2)` | Nullable | ความยาวของกล่อง (ซม.) |
| `box_height_cm` | `NUMERIC(8,2)` | Nullable | ความสูงของกล่อง (ซม.) |
| `actual_weight_kg`| `NUMERIC(9,3)` | Nullable | น้ำหนักชั่งจริงรวมกล่อง (กก.) |
| `warehouse_status`| `VARCHAR(32)` | Default 'NOT_ARRIVED' | สถานะ: NOT_ARRIVED, ARRIVED_IN_WAREHOUSE |
| `arrived_at` | `TIMESTAMPTZ` | Nullable | วันเวลาที่สินค้าเดินทางถึงคลังไทย |

#### 5. ตาราง `preorders` (ตารางควบคุมรอบพรีออเดอร์)
| ชื่อคอลัมน์ (Field) | ชนิดข้อมูล (Data Type) | ข้อกำหนด (Constraints) | คำอธิบาย (Description) |
| :--- | :--- | :--- | :--- |
| `product_variant_id`| `BIGINT` | PK, FK -> variants.id | รหัสสินค้าตัวเลือกที่เปิดพรีออเดอร์ |
| `start_date` | `TIMESTAMPTZ` | Not Null | วันเวลาเริ่มต้นเปิดรับจอง |
| `end_date` | `TIMESTAMPTZ` | Not Null | วันเวลาปิดรับจอง |
| `quota_limit` | `BIGINT` | Nullable | โควตาสูงสุดที่เปิดรับจอง (Null = ไม่จำกัด) |
| `booked_count` | `BIGINT` | Default 0 | จำนวนยอดที่ถูกจองแล้ว |
| `deposit_amount` | `NUMERIC(12,2)` | Nullable | จำนวนเงินมัดจำต่อชิ้น (บาท) |
| `full_price` | `NUMERIC(12,2)` | Not Null | ราคาเต็มของสินค้า (บาท) |
| `release_date` | `TIMESTAMPTZ` | Nullable | วันที่ประมาณการวางจำหน่ายจริง |
| `release_status` | `ENUM` | Default 'OnSchedule' | สถานะ: OnSchedule, Delayed, Arrived |

#### 6. ตาราง `orders` (คำสั่งซื้อ)
| ชื่อคอลัมน์ (Field) | ชนิดข้อมูล (Data Type) | ข้อกำหนด (Constraints) | คำอธิบาย (Description) |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | PK, Identity | รหัสคำสั่งซื้อ |
| `user_id` | `INTEGER` | FK -> users.id | ผู้สั่งซื้อ |
| `order_number` | `VARCHAR(100)` | Unique, Not Null | รหัสอ้างอิงใบสั่งซื้อ เช่น `ORD-202610-0012` |
| `total_amount` | `NUMERIC(12,2)` | Not Null, Check >= 0 | ยอดรวมทั้งสิ้นของบิล (รวมค่าส่ง) |
| `immediate_amount` | `NUMERIC(12,2)` | Default 0 | ยอดที่ต้องชำระทันทีในงวดแรก |
| `remaining_balance_amount`| `NUMERIC(12,2)`| Default 0 | ยอดคงเหลือที่ต้องรอจ่ายเมื่อของถึงคลัง |
| `shipping_fee` | `NUMERIC(12,2)` | Default 0 | ค่าบริการจัดส่งพัสดุ |
| `shipping_policy` | `VARCHAR(100)` | Not Null | นโยบายการจัดส่ง: SPLIT หรือ COMBINED |
| `order_status` | `VARCHAR(32)` | Default 'pending' | pending, processing, shipped, completed, cancelled |
| `payment_status` | `VARCHAR(20)` | Default 'UNPAID' | UNPAID, DEPOSIT_PAID, PAID, DEPOSIT_FORFEITED |
| `settlement_status`| `VARCHAR(40)` | Default 'NOT_REQUIRED' | NOT_REQUIRED, WAITING_FOR_ARRIVAL, AWAITING_BALANCE_PAYMENT, READY_TO_PACK, DEPOSIT_FORFEITED |
| `balance_due_date` | `TIMESTAMPTZ` | Nullable | กำหนดชำระเงินงวดสุดท้าย (7 วันหลังของถึง) |
| `balance_payment_reference`| `VARCHAR(200)`| Unique, Nullable | รหัสธุรกรรมที่ใช้จ่ายเงินงวดสุดท้าย |

#### 7. ตาราง `bank_slips` (ประวัติการตรวจสอบสลิป)
| ชื่อคอลัมน์ (Field) | ชนิดข้อมูล (Data Type) | ข้อกำหนด (Constraints) | คำอธิบาย (Description) |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | PK, Identity | รหัสประวัติสลิป |
| `order_id` | `BIGINT` | FK -> orders.id | คำสั่งซื้อที่แนบสลิป |
| `payment_stage` | `VARCHAR(16)` | Check in ('INITIAL', 'BALANCE') | ชำระงวดแรก หรือ ชำระยอดคงค้าง |
| `transaction_ref` | `VARCHAR(200)` | Unique, Not Null | เลขอ้างอิงธุรกรรมจากธนาคาร |
| `slip_hash` | `CHAR(64)` | Unique, Not Null | SHA-256 Checksum ของไฟล์รูปสลิป |
| `receiver_account` | `VARCHAR(64)` | Not Null | เลขบัญชี/พร้อมเพย์ปลายทางที่ได้รับเงิน |
| `transfer_amount` | `NUMERIC(12,2)` | Not Null, Check > 0 | ยอดเงินที่โอนจริงตามสลิป |
| `transferred_at` | `TIMESTAMPTZ` | Not Null | เวลาที่โอนเงินจริงจากธนาคาร |
| `verified_at` | `TIMESTAMPTZ` | Default NOW() | วันเวลาที่ระบบตรวจสอบสำเร็จ |

#### 8. ตาราง `product_waitlists` (ระบบคิวรอรับสิทธิ์)
| ชื่อคอลัมน์ (Field) | ชนิดข้อมูล (Data Type) | ข้อกำหนด (Constraints) | คำอธิบาย (Description) |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | PK, Identity | รหัสรายการ Waitlist |
| `product_variant_id`| `BIGINT` | FK -> variants.id | สินค้าที่ต่อคิว |
| `user_id` | `INTEGER` | FK -> users.id | ผู้ใช้งานที่ต่อคิว |
| `queue_position` | `BIGINT` | Not Null, Check > 0 | ลำดับคิว (Unique ต่อ variant_id) |
| `status` | `ENUM` | Default 'WAITING' | WAITING, OFFERED, CONVERTED, EXPIRED, CANCELLED |
| `claim_token` | `UUID` | Nullable | รหัส Token พิเศษสำหรับกดรับสิทธิ์สั่งซื้อ |
| `offer_expires_at` | `TIMESTAMPTZ` | Nullable | กำหนดเวลาหมดอายุสิทธิ์ (48 ชม. หลัง Offer) |

#### 9. ตาราง `tax_invoices` (ใบกำกับภาษีอิเล็กทรอนิกส์)
| ชื่อคอลัมน์ (Field) | ชนิดข้อมูล (Data Type) | ข้อกำหนด (Constraints) | คำอธิบาย (Description) |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | PK, Identity | รหัสใบกำกับภาษี |
| `order_id` | `BIGINT` | Unique, FK -> orders.id| รหัสคำสั่งซื้อที่ออกใบกำกับ |
| `user_id` | `INTEGER` | FK -> users.id | ผู้ขอรับใบกำกับภาษี |
| `invoice_number` | `VARCHAR(24)` | Unique, Not Null | เลขที่ใบกำกับภาษี เช่น `INV-202610-0001` |
| `entity_type` | `ENUM` | Not Null | บุคคลธรรมดา (`INDIVIDUAL`) หรือ นิติบุคคล (`CORPORATION`) |
| `tax_id` | `CHAR(13)` | Not Null, Check Mod 11 | เลขประจำตัวผู้เสียภาษี 13 หลัก |
| `company_or_name` | `VARCHAR(200)` | Not Null | ชื่อ-นามสกุล หรือ ชื่อบริษัท |
| `branch_type` | `ENUM` | Nullable | สำนักงานใหญ่ (`HEAD_OFFICE`) หรือ สาขา (`BRANCH`) |
| `branch_code` | `CHAR(5)` | Nullable | รหัสสาขา 5 หลัก (เช่น 00000) |
| `non_vat_amount` | `NUMERIC(14,2)`| Not Null | ยอดสินค้าที่ได้รับยกเว้นภาษี (มังงะ/หนังสือ) |
| `vatable_amount` | `NUMERIC(14,2)`| Not Null | ยอดสินค้าก่อนภาษีที่ต้องคิด VAT (ฟิกเกอร์/ค่าส่ง) |
| `vat_amount` | `NUMERIC(14,2)`| Not Null | ภาษีมูลค่าเพิ่ม 7% |
| `total_amount` | `NUMERIC(14,2)`| Not Null | ยอดรวมทั้งสิ้นสุทธิ |
| `pdf_file_url` | `TEXT` | Nullable | URL ดาวน์โหลดไฟล์ PDF |
| `status` | `ENUM` | Default 'ISSUED' | สถานะ: ISSUED, CANCELLED |

---

## 6. โฟลว์การทำงานและลำดับกระบวนการ (Core Business Workflows & Sequence Diagrams)

### 6.1 โฟลว์การสั่งซื้อสินค้าแบบผสมและการคิดค่าจัดส่ง (Unified Mixed Checkout)

```mermaid
sequenceDiagram
    autonumber
    actor Customer as ลูกค้า (Customer)
    participant UI as ระบบหน้าบ้าน (Next.js)
    participant API as Checkout Service (Express)
    participant DB as ฐานข้อมูล (PostgreSQL)

    Customer->>UI: ใส่สินค้าลงตะกร้า (มังงะในสต็อก + ฟิกเกอร์พรีออเดอร์)
    Customer->>UI: เลือกวิธีชำระฟิกเกอร์ (DEPOSIT หรือ FULL)
    Customer->>UI: เลือกผู้ให้บริการขนส่ง (Flash / Thai Post)
    UI->>API: POST /api/checkout/unified
    
    rect rgb(240, 245, 255)
    Note over API,DB: การคำนวณและตรวจสอบข้อมูลใน Database Transaction
    API->>DB: BEGIN TRANSACTION
    API->>DB: SELECT ... FOR UPDATE (ตรวจสอบสต็อกมังงะ และโควตาฟิกเกอร์)
    API->>API: คำนวณน้ำหนัก Dimensional Weight เปรียบเทียบกับ Actual Weight
    API->>API: คำนวณค่าส่งตามตารางอัตราค่าขนส่ง
    API->>API: คำนวณ immediateAmount (งวดแรก) และ remainingBalanceAmount
    API->>DB: บันทึก orders และ order_items
    API->>DB: หักสต็อกมังงะ และเพิ่ม booked_count ในพรีออเดอร์
    API->>DB: COMMIT TRANSACTION
    end

    API-->>UI: ส่งกลับ Order Number, immediateAmount, และ PromptPay QR Code
    UI-->>Customer: แสดงหน้าชำระเงินพร้อม QR Code และแจกแจงงวดชำระ
```

---

### 6.2 โฟลว์การตรวจสอบสลิปโอนเงินและการป้องกันสลิปซ้ำ (Bank Slip Verification)

```mermaid
sequenceDiagram
    autonumber
    actor Customer as ลูกค้า (Customer)
    participant UI as ระบบหน้าบ้าน (Next.js)
    participant SlipService as Slip Verification Service
    participant SlipProvider as External Bank Verification API
    participant DB as ฐานข้อมูล (PostgreSQL)

    Customer->>UI: อัปโหลดรูปสลิปโอนเงิน
    UI->>SlipService: POST /api/payments/verify-slip (FormData: file + orderId)
    
    SlipService->>SlipService: คำนวณ SHA-256 Hash จากเนื้อหาไฟล์สลิป
    SlipService->>DB: ตรวจสอบ WHERE slip_hash = ?
    alt พบ Hash ซ้ำในระบบ
        DB-->>SlipService: สลิปนี้เคยใช้งานแล้ว
        SlipService-->>UI: 400 Bad Request (SLIP_ALREADY_USED)
        UI-->>Customer: แจ้งเตือน: สลิปนี้ถูกใช้งานไปแล้ว ไม่สามารถใช้ซ้ำได้
    else สลิปใหม่
        SlipService->>SlipProvider: ส่งรูปสลิปไปตรวจสอบข้อมูลทางการเงิน
        SlipProvider-->>SlipService: ข้อมูลธุรกรรม (Ref, ยอดเงิน, บัญชีผู้รับ, วันเวลาโอน)
        SlipService->>DB: ตรวจสอบ WHERE transaction_ref = ?
        alt พบ Transaction Reference ซ้ำ
            SlipService-->>UI: 400 Bad Request (TRANSACTION_ALREADY_EXISTS)
            UI-->>Customer: แจ้งเตือน: รายการโอนเงินนี้เคยถูกบันทึกในระบบแล้ว
        else ธุรกรรมถูกต้อง
            SlipService->>SlipService: ตรวจสอบยอดเงินโอน >= ยอดที่ต้องชำระของคำสั่งซื้อ
            SlipService->>DB: INSERT INTO bank_slips (...)
            SlipService->>DB: UPDATE orders SET payment_status = 'PAID' (หรือ 'DEPOSIT_PAID')
            SlipService-->>UI: 200 OK (Verification Success)
            UI-->>Customer: แสดงผลชำระเงินสำเร็จ และอัปเดตหน้าสถานะคำสั่งซื้อ
        end
    end
```

---

### 6.3 วงจรการตัดยอดมัดจำ การแจ้งเตือน และการริบมัดจำ (Preorder Balance Settlement & Forfeiture)

```mermaid
stateDiagram-v2
    [*] --> DEPOSIT_PAID: ลูกค้าชำระมัดจำสำเร็จ (สถานะ: WAITING_FOR_ARRIVAL)
    
    DEPOSIT_PAID --> AWAITING_BALANCE_PAYMENT: เจ้าหน้าที่กดรับของเข้าคลัง (Arrived in Warehouse)
    note right of AWAITING_BALANCE_PAYMENT
        ระบบเริ่มนับถอยหลัง 7 วัน (balanceDueDate)
        และส่ง LINE / Email แจ้งเตือนลูกค้าทันที
    end note

    AWAITING_BALANCE_PAYMENT --> PAID: ลูกค้าชำระเงินงวดสุดท้ายภายใน 7 วัน
    PAID --> READY_TO_PACK: ฝ่ายคลังแพ็คสินค้าเตรียมจัดส่ง
    READY_TO_PACK --> SHIPPED: จัดส่งพัสดุและแจ้งเลขแทร็กกิ้ง
    SHIPPED --> [*]

    AWAITING_BALANCE_PAYMENT --> DEPOSIT_FORFEITED: เกินกำหนด 7 วัน (Cron ตรวจพบ)
    note right of DEPOSIT_FORFEITED
        ริบเงินมัดจำทันที (ไม่คืนเงิน)
        ปลดปล่อยโควตาสินค้า 1 ชิ้น
        ส่งต่อสิทธิ์ให้คิว Waitlist ลำดับแรก
    end note
    DEPOSIT_FORFEITED --> [*]
```

---

### 6.4 การส่งต่อสิทธิ์ให้คิวสำรองสินค้าพรีออเดอร์ (Waitlist Queue Allocation Flow)

```mermaid
sequenceDiagram
    autonumber
    participant Cron as Balance Settlement Cron (00:00 Daily)
    participant WaitlistWorker as Waitlist Worker
    participant DB as ฐานข้อมูล (PostgreSQL)
    participant Notification as LINE / Email Service
    actor WaitlistUser as ลูกค้าคิวสำรอง (Waitlist Queue #1)

    Cron->>DB: ค้นหาคำสั่งซื้อที่ AWAITING_BALANCE_PAYMENT และ NOW() > balance_due_date
    DB-->>Cron: รายการคำสั่งซื้อที่หมดเวลาชำระเงิน
    Cron->>DB: UPDATE orders SET settlement_status = 'DEPOSIT_FORFEITED'
    
    Cron->>WaitlistWorker: กระตุ้นการจัดสรรโควตาหลุด (Allocate Released Quota)
    WaitlistWorker->>DB: ดึงคิวแรกของสินค้านั้น (WHERE status = 'WAITING' ORDER BY queue_position ASC LIMIT 1)
    DB-->>WaitlistWorker: ข้อมูลลูกค้าคิวลำดับที่ 1
    
    WaitlistWorker->>DB: สร้าง claim_token (UUID) และตั้ง offer_expires_at = NOW() + 48 ชม.
    WaitlistWorker->>DB: UPDATE product_waitlists SET status = 'OFFERED'
    WaitlistWorker->>Notification: ส่งข้อความแจ้งเตือนพร้อมสิทธิ์การจอง
    Notification-->>WaitlistUser: "ยินดีด้วย! คุณได้รับสิทธิ์สั่งซื้อฟิกเกอร์ กรุณากดชำระเงินภายใน 48 ชม."

    alt ลูกค้ากดรับสิทธิ์ภายใน 48 ชั่วโมง
        WaitlistUser->>WaitlistWorker: POST /api/checkout/waitlist/claim (claim_token)
        WaitlistWorker->>DB: สร้างคำสั่งซื้อใหม่ และ UPDATE waitlist status = 'CONVERTED'
        WaitlistWorker-->>WaitlistUser: นำทางไปยังหน้าชำระเงินทันที
    else ลูกค้าไม่กดรับสิทธิ์ภายใน 48 ชั่วโมง
        WaitlistWorker->>DB: UPDATE waitlist status = 'EXPIRED'
        WaitlistWorker->>WaitlistWorker: ดึงคิวลำดับถัดไป (Queue #2) วนลูปการทำงาน
    end
```

---

### 6.5 การออกใบกำกับภาษีอิเล็กทรอนิกส์ตามหมวดหมู่ภาษี (Mixed Tax Calculation Flow)

```mermaid
flowchart TD
    Start([เริ่มการออกใบกำกับภาษี]) --> ReadOrder[อ่านข้อมูลคำสั่งซื้อและรายการสินค้า]
    ReadOrder --> SplitItems{แยกหมวดหมู่สินค้า}
    
    SplitItems -->|หนังสือ / มังงะ / ไลท์โนเวล| NonVat[จัดเข้าหมวดหมู่: ได้รับการยกเว้นภาษีมูลค่าเพิ่ม<br/>Non-VAT Amount / VAT Exempt]
    SplitItems -->|ฟิกเกอร์ / ของเล่น / ค่าจัดส่งพัสดุ| Vat7[จัดเข้าหมวดหมู่: คิดภาษีมูลค่าเพิ่ม 7%<br/>Vatable Amount]
    
    NonVat --> SumTotal[รวมยอดแยกหมวดหมู่]
    Vat7 --> CalcVat[คำนวณภาษีแยก: VAT = Vatable Amount x 7 / 107]
    CalcVat --> SumTotal
    
    SumTotal --> CheckTaxId{ตรวจสอบ Tax ID 13 หลัก}
    CheckTaxId -->|ไม่ผ่าน Mod 11| Reject[ส่งข้อผิดพลาด: เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง]
    CheckTaxId -->|ผ่าน| GenNumber[ออกเลขที่ใบกำกับภาษีจาก Sequence ประจำเดือน<br/>เช่น INV-202610-0042]
    
    GenNumber --> GenPDF[สร้างไฟล์ PDF ด้วย PDFKit<br/>ฟอนต์สารบรรณ Sarabun + แปลงตัวเลขเป็นข้อความบาทไทย]
    GenPDF --> SaveStorage[บันทึกไฟล์ลงคลังเอกสารและอัปเดตตาราง tax_invoices]
    SaveStorage --> SendMail[ส่งอีเมลพร้อมแนบ PDF ไปยังลูกค้าโดยอัตโนมัติ]
    SendMail --> Finish([เสร็จสิ้นกระบวนการ])
```

---

### 6.6 กลไกการจับสลากออนไลน์ Ichiban Kuji และรางวัล Last One Prize

```mermaid
sequenceDiagram
    autonumber
    actor Customer as ลูกค้า (Customer)
    participant UI as ระบบหน้าบ้าน (Next.js Kuji Page)
    participant KujiService as Kuji Router & Service
    participant DB as ฐานข้อมูล / In-Memory State

    Customer->>UI: เปิดหน้าตู้สลาก Ichiban Kuji
    UI->>KujiService: GET /api/kuji/status
    KujiService-->>UI: จำนวนตั๋วคงเหลือในตู้, รายการรางวัลคงเหลือ (A, B, C, D, E, F)
    
    Customer->>UI: กดปุ่มจับสลาก (เช่น ซื้อ 5 ใบ หรือ ดึงสลากที่เหลือทั้งหมด)
    UI->>KujiService: POST /api/kuji/draw (count: 5)
    
    rect rgb(255, 245, 240)
    Note over KujiService,DB: การคำนวณสุ่มผลรางวัลแบบ Real-Time Atomicity
    KujiService->>DB: ตรวจสอบจำนวนตั๋วคงเหลือ >= จำนวนที่ดึง
    KujiService->>KujiService: สุ่มผลรางวัลตามสัดส่วนรางวัลที่ยังคงอยู่ในตู้
    KujiService->>DB: ตัดจำนวนสต็อกรางวัลออกจากกล่อง (Deduct Ticket Counts)
    
    opt เมื่อตั๋วถูกดึงจนหมดตู้ (remainingTickets == 0)
        KujiService->>KujiService: มอบรางวัลพิเศษ 'Last One Prize' ให้กับตั๋วใบสุดท้ายโดยอัตโนมัติ!
    end
    end

    KujiService-->>UI: ส่งผลการสลาก (รายการรางวัลที่ได้ + ธงระบุ Last One Prize)
    UI-->>Customer: แสดงแอนิเมชันเปิดตั๋วสลาก และแสดงรายการของรางวัลที่ได้รับ
```

---

## 7. ข้อกำหนดส่วนต่อประสานโปรแกรมประยุกต์ (API Specification & Contracts)

### 7.1 หมวดการพิสูจน์ตัวตน (Authentication Endpoints)
| HTTP Method | Endpoint | สิทธิ์เข้าถึง (Auth) | คำอธิบาย (Description) |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | ลงทะเบียนผู้ใช้งานใหม่ |
| `POST` | `/api/auth/login` | Public | เข้าสู่ระบบ และรับ JWT Token ใน Cookie |
| `POST` | `/api/auth/logout` | Authenticated | เคลียร์ Authentication Cookie |
| `GET` | `/api/auth/me` | Authenticated | ดึงข้อมูลโปรไฟล์และสิทธิ์ของผู้ใช้ปัจจุบัน |

### 7.2 หมวดแคตตาล็อกสินค้า (Catalog Endpoints)
| HTTP Method | Endpoint | สิทธิ์เข้าถึง (Auth) | คำอธิบาย (Description) |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/catalog` | Public | ดึงรายการสินค้าทั้งหมด (รองรับ Filter `category=MANGA/FIGURE`) |
| `GET` | `/api/catalog/:slug` | Public | ดึงข้อมูลสินค้าโดยละเอียดและรายการ Variant |
| `GET` | `/api/catalog/search` | Public | ค้นหาสินค้าตามคีย์เวิร์ด, ซีรีส์, หรือสำนักพิมพ์ |

### 7.3 หมวดการสั่งซื้อและชำระเงิน (Checkout & Payment Endpoints)
| HTTP Method | Endpoint | สิทธิ์เข้าถึง (Auth) | คำอธิบาย (Description) |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/checkout/unified` | Customer | สั่งซื้อสินค้าแบบผสม (Mixed Cart) และรับยอดชำระงวดแรก |
| `POST` | `/api/payments/verify-slip` | Customer | อัปโหลดสลิปโอนเงินเพื่อตรวจสอบความถูกต้องแบบอัตโนมัติ |
| `POST` | `/api/checkout/balance/settle`| Customer | ชำระเงินงวดสุดท้ายสำหรับฟิกเกอร์พรีออเดอร์ที่มาถึงคลัง |
| `POST` | `/api/checkout/waitlist/claim`| Customer | ใช้ Token สิทธิพิเศษสั่งซื้อสินค้าจากคิวสำรอง Waitlist |

### 7.4 หมวดการบริหารจัดการและคลังสินค้า (Backoffice Endpoints)
| HTTP Method | Endpoint | สิทธิ์เข้าถึง (Auth) | คำอธิบาย (Description) |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/admin/figures/arrive` | Staff / Admin | บันทึกฟิกเกอร์เข้าคลัง และเริ่มนับเวลาชำระเงิน 7 วัน |
| `GET` | `/api/staff/orders/packing` | Staff / Admin | ดึงรายการคำสั่งซื้อสถานะ `READY_TO_PACK` |
| `PATCH` | `/api/staff/orders/shipped` | Staff / Admin | บันทึกเลข Tracking Number และสถานะจัดส่ง |
| `POST` | `/api/tax-invoices` | Customer | ส่งคำขอออกใบกำกับภาษีเต็มรูปแบบ |
| `GET` | `/api/finance/tax-invoices` | Finance / Admin | ดูรายงานใบกำกับภาษีและยอดสรุปภาษีมูลค่าเพิ่ม |

---

## 8. ความมั่นคงปลอดภัยและการจัดการข้อผิดพลาด (Security & Error Handling)

### 8.1 การป้องกันทุจริตและการรักษาความปลอดภัย (Security Measures)
1. **การป้องกันสลิปวน (Anti-Double-Spending):**
   * คำนวณ SHA-256 Hash ของไฟล์รูปสลิปทุกครั้งที่อัปโหลด
   * บันทึกค่า Hash ใน Unique Index ของตาราง `bank_slips` เพื่อปฏิเสธไฟล์ที่ซ้ำทันทีในระดับฐานข้อมูล
   * ตรวจสอบ Unique Transaction Reference ของธนาคารร่วมด้วย
2. **การรักษาความปลอดภัยของรหัสผ่านและเซสชัน:**
   * เข้ารหัสรหัสผ่านด้วย `bcryptjs` จำนวน 10 Salt Rounds
   * ใช้ JSON Web Token (JWT) โดยจัดเก็บใน `HttpOnly`, `SameSite=Lax`, และ `Secure` Cookie เพื่อป้องกันการโจมตีประเภท Cross-Site Scripting (XSS)
3. **การป้องกัน Race Condition:**
   * ใช้คำสั่ง `SELECT ... FOR UPDATE` ในขั้นตอนหักสต็อกสินค้า, ลดโควตาพรีออเดอร์, และการจับสลาก Kuji เพื่อป้องกันการขายเกินสต็อก (Overselling) ในสภาวะที่มีการสั่งซื้อพร้อมกันจำนวนมาก
4. **การตรวจสอบความถูกต้องของข้อมูล (Input Validation):**
   * ใช้ Zod Library ตรวจสอบ Schema ของ Request Body ทุกจุด
   * ตรวจสอบเลขบัตรประชาชน/เลขประจำตัวผู้เสียภาษี 13 หลักด้วย Modulo 11 Algorithm

### 8.2 รหัสข้อผิดพลาดมาตรฐานของระบบ (Standard Error Codes)
```json
{
  "success": false,
  "error": {
    "code": "STRING_ERROR_CODE",
    "message": "ข้อความอธิบายความผิดพลาดสำหรับแสดงผลให้ผู้ใช้ทราบ",
    "details": {}
  }
}
```

| รหัสข้อผิดพลาด (Code) | HTTP Status | ความหมาย (Meaning) |
| :--- | :---: | :--- |
| `UNAUTHORIZED` | 401 | ไม่พบข้อมูลการเข้าสู่ระบบ หรือ Token หมดอายุ |
| `FORBIDDEN` | 403 | ไม่มีสิทธิ์เข้าถึงฟังก์ชันดังกล่าว (สิทธิ์ไม่ตรงตาม RBAC) |
| `INVALID_INPUT` | 400 | ข้อมูลที่ส่งมาไม่ถูกต้องตามข้อกำหนดของ Zod Schema |
| `INSUFFICIENT_STOCK` | 409 | สินค้าในสต็อกไม่เพียงพอต่อจำนวนที่ต้องการสั่งซื้อ |
| `PREORDER_QUOTA_EXCEEDED`| 409 | ยอดจองพรีออเดอร์เต็มโควตาแล้ว (แนะนำให้เข้า Waitlist) |
| `SLIP_ALREADY_USED` | 400 | สลิปโอนเงินนี้เคยถูกใช้งานในระบบแล้ว (ปฏิเสธสลิปซ้ำ) |
| `SLIP_AMOUNT_MISMATCH` | 400 | ยอดเงินในสลิปไม่ตรงกับยอดที่ระบบเรียกเก็บ |
| `BALANCE_PAYMENT_OVERDUE`| 410 | คำสั่งซื้อเกินกำหนดชำระเงิน 7 วัน และถูกริบมัดจำแล้ว |
| `WAITLIST_TOKEN_EXPIRED` | 410 | สิทธิ์การสั่งซื้อสำหรับคิวสำรองหมดอายุ 48 ชั่วโมงแล้ว |

---

## 9. การติดตั้ง สภาพแวดล้อม และงานเบื้องหลัง (Deployment & Scheduled Tasks)

### 9.1 ตัวแปรสภาพแวดล้อมที่จำเป็น (Environment Variables)
ระบบต้องการตัวแปรสภาพแวดล้อม ( Environment Variables) ในไฟล์ `.env` ดังนี้:

```env
# Database & Cache Configuration
POSTGRES_USER=manga
POSTGRES_PASSWORD=manga_dev_password
POSTGRES_DB=manga_store
POSTGRES_PORT=5432
DATABASE_URL=postgresql://manga:manga_dev_password@localhost:5432/manga_store?schema=public
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379

# Server Network & Ports
API_PORT=4000
WEB_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000

# Authentication Secrets
AUTH_ACCESS_TOKEN_SECRET=your-super-strong-jwt-secret-key-32chars
AUTH_JWT_ISSUER=manga-store
AUTH_JWT_AUDIENCE=manga-store-web

# Payment & Slip Verification
PROMPTPAY_ID=0105559999999
MOCK_SLIP_VERIFY=false
SLIP_VERIFICATION_ENDPOINT=https://api.slipverification.provider/v1/verify
SLIP_VERIFICATION_API_KEY=your_slip_api_key_here
SLIP_VERIFICATION_PROVIDER=open-slip-verify

# Notifications & Third-Party
LINE_CHANNEL_ACCESS_TOKEN=your_line_messaging_channel_token
RESEND_API_KEY=your_resend_email_api_key
EMAIL_FROM=orders@mangacollectibles.com
```

### 9.2 งานประมวลผลเบื้องหลัง (Scheduled Cron Jobs)
ระบบมีการตั้งค่า Cron Job อัตโนมัติผ่าน `node-cron` เพื่อดูแลรักษาสถานะข้อมูลให้เป็นปัจจุบัน:

```mermaid
gantt
    title กำหนดการทำงานของ Background Tasks ประจำวัน
    dateFormat HH:mm
    axisFormat %H:%M

    section งานริบเงินมัดจำ
    ตรวจจับออเดอร์ค้างชำระเกิน 7 วัน และริบมัดจำ :milestone, 00:00, 10m
    
    section งานคิวสำรอง Waitlist
    ตรวจสอบ Offer ที่หมดอายุ 48 ชม. และส่งต่อสิทธิ์ให้คิวถัดไป :crit, active, 00:10, 15m
    ตรวจเช็กความพร้อมคิวสำรองทุก 10 นาที :00:00, 23:59
```

1. **Daily Balance Forfeiture Cron (`0 0 * * *` - ทำงานทุกเที่ยงคืน):**
   * ตรวจสอบคำสั่งซื้อสถานะ `AWAITING_BALANCE_PAYMENT` ที่มี `NOW() > balance_due_date`
   * เปลี่ยนสถานะเป็น `DEPOSIT_FORFEITED` (ริบเงินมัดจำ)
   * ส่งสัญญาณกระตุ้นระบบ Waitlist เพื่อปล่อยโควตาสินค้าให้คิวถัดไปทันที
2. **Waitlist Maintenance Worker (ทำงานทุก 10 นาที):**
   * ตรวจสอบรายการในตาราง `product_waitlists` ที่มีสถานะ `OFFERED` แต่เลยกำหนดเวลา `offer_expires_at` (48 ชั่วโมง)
   * เปลี่ยนสถานะเป็น `EXPIRED` และดึงคิวลำดับถัดไปขึ้นมาเป็น `OFFERED` พร้อมส่งแจ้งเตือน

---

### 10. สรุปผลการวิเคราะห์และข้อเสนอแนะ (Conclusion & Next Steps)
เอกสารการวิเคราะห์และออกแบบระบบ (SA) ฉบับนี้ครอบคลุมการทำงานครบทุกมิติของธุรกิจร้านค้ามังงะและฟิกเกอร์ของสะสม ทั้งในแง่ของโครงสร้างฐานข้อมูลที่มีความยืดหยุ่นสูง กฎเกณฑ์ทางธุรกิจที่รัดกุม (เช่น การแยกภาษี, การตรวจสลิปสองชั้น, การคิดค่าส่งตามขนาดกล่อง, วงจรมัดจำ 7 วัน และคิวสำรอง) 

ทีมพัฒนาสามารถใช้เอกสารนี้เป็นพิมพ์เขียว (Architecture Blueprint) ในการทดสอบระบบ (Test Scenarios), พัฒนาฟังก์ชันเพิ่มเติมในอนาคต เช่น การเชื่อมต่อ API คลังสินค้าภายนอก (WMS) หรือระบบสะสมแต้มแบบ Gamification ต่อไปได้อย่างมีประสิทธิภาพ
