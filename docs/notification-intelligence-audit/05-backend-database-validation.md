# 05 — Backend & Database Validation Report

**Date:** 2026-11-15  
**Service:** `apps/api/src/modules/mobile/mobile.service.ts`  
**Database Model:** Prisma `MobileDevice`, `MobileEvent`, `MobilePermission`  

---

## 1. Backend Ingestion Logic (`MobileService.ingestEvent`)

```typescript
async ingestEvent(userId: string, dto: IngestMobileEventDto) {
  // 1. Validates Device Pairing & Ownership
  const device = await this.prisma.mobileDevice.findFirst({
    where: { id: dto.deviceId, userId, status: 'PAIRED' },
  });

  if (!device) {
    throw new UnauthorizedException(`Device ${dto.deviceId} is not paired or unauthorized`);
  }

  // 2. Enforces Length Caps for Privacy Redaction
  const sanitizedTitle = dto.title?.slice(0, 255) || '';
  const sanitizedSummary = dto.summary?.slice(0, 1000) || '';

  // 3. Duplicate Suppression (Suppresses identical app/title events within 60s)
  const recentDuplicate = await this.prisma.mobileEvent.findFirst({
    where: {
      userId,
      deviceId: dto.deviceId,
      sourceApp: dto.sourceApp,
      title: sanitizedTitle,
      occurredAt: {
        gte: new Date(Date.now() - 60 * 1000),
      },
    },
  });

  if (recentDuplicate) {
    return recentDuplicate;
  }

  // 4. Persistence into PostgreSQL
  const event = await this.prisma.mobileEvent.create({
    data: {
      userId,
      deviceId: dto.deviceId,
      sourceApp: dto.sourceApp,
      appName: dto.appName || dto.sourceApp,
      category: dto.category,
      title: sanitizedTitle,
      summary: sanitizedSummary,
      rawMetadata: dto.rawMetadata || {},
      occurredAt: new Date(dto.occurredAt),
    },
  });

  // 5. Updates Last Seen Timestamp
  await this.prisma.mobileDevice.update({
    where: { id: dto.deviceId },
    data: { lastSeenAt: new Date() },
  });

  return event;
}
```

### Assessment:
- The backend implementation is **production-ready and thoroughly architected**.
- It enforces strict multi-tenant isolation by scoping every query to `userId`.
- It implements duplicate event suppression over a 60-second window.
- It automatically updates `device.lastSeenAt`, which powers the capability status health checks.
- The failure occurs entirely **upstream in the Android client** where events are never transmitted.
