module.exports = [
"[project]/.next-internal/server/app/api/banners/route/actions.js [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__, module, exports) => {

}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/mongoose [external] (mongoose, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("mongoose", () => require("mongoose"));

module.exports = mod;
}),
"[project]/src/lib/mongodb.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "connectToDatabase",
    ()=>connectToDatabase,
    "default",
    ()=>__TURBOPACK__default__export__,
    "isDbConnectionError",
    ()=>isDbConnectionError
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/mongoose [external] (mongoose, cjs)");
;
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable in .env.local");
}
const cached = global._mongooseCache ?? {
    conn: null,
    promise: null
};
global._mongooseCache = cached;
async function connectToDatabase() {
    if (cached.conn) {
        return cached.conn;
    }
    if (!cached.promise) {
        cached.promise = __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["default"].connect(MONGODB_URI, {
            bufferCommands: false,
            serverSelectionTimeoutMS: 8_000,
            connectTimeoutMS: 8_000
        }).then((m)=>m);
    }
    cached.conn = await cached.promise;
    return cached.conn;
}
function isDbConnectionError(err) {
    return err instanceof Error && (err.name === 'MongooseServerSelectionError' || err.name === 'MongoServerSelectionError');
}
const __TURBOPACK__default__export__ = connectToDatabase;
}),
"[project]/src/models/PromotionBanner.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PromotionBannerModel",
    ()=>PromotionBannerModel
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/mongoose [external] (mongoose, cjs)");
;
const PromotionBannerSchema = new __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["Schema"]({
    title: {
        type: String,
        required: true,
        trim: true
    },
    subtitle: {
        type: String,
        default: '',
        trim: true
    },
    imageUrl: {
        type: String,
        required: true,
        trim: true
    },
    linkUrl: {
        type: String,
        default: '',
        trim: true
    },
    placement: {
        type: String,
        enum: [
            'left_primary',
            'left_secondary',
            'right_primary',
            'right_secondary'
        ],
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: [
            'draft',
            'active',
            'paused'
        ],
        default: 'draft',
        index: true
    },
    startsAt: {
        type: Date,
        required: true
    },
    endsAt: {
        type: Date,
        required: true
    },
    priority: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});
PromotionBannerSchema.index({
    placement: 1,
    status: 1,
    startsAt: 1,
    endsAt: 1
});
const PromotionBannerModel = __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["default"].models.PromotionBanner ?? __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["default"].model('PromotionBanner', PromotionBannerSchema);
}),
"[project]/src/lib/banners.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BANNER_PLACEMENT_LABELS",
    ()=>BANNER_PLACEMENT_LABELS,
    "computeBannerDisplayStatus",
    ()=>computeBannerDisplayStatus,
    "isBannerPubliclyVisible",
    ()=>isBannerPubliclyVisible,
    "toAdminBanner",
    ()=>toAdminBanner,
    "toPublicBanner",
    ()=>toPublicBanner
]);
function computeBannerDisplayStatus(banner, now = new Date()) {
    if (banner.status === 'draft') return 'draft';
    if (banner.status === 'paused') return 'paused';
    if (now < banner.startsAt) return 'scheduled';
    if (now > banner.endsAt) return 'expired';
    return 'live';
}
function isBannerPubliclyVisible(banner, now = new Date()) {
    return banner.status === 'active' && now >= banner.startsAt && now <= banner.endsAt;
}
function toPublicBanner(doc) {
    return {
        id: doc._id.toString(),
        title: doc.title,
        subtitle: doc.subtitle,
        imageUrl: doc.imageUrl,
        linkUrl: doc.linkUrl || undefined,
        placement: doc.placement,
        startsAt: doc.startsAt.toISOString(),
        endsAt: doc.endsAt.toISOString(),
        priority: doc.priority
    };
}
function toAdminBanner(doc) {
    const displayStatus = computeBannerDisplayStatus(doc);
    return {
        id: doc._id.toString(),
        title: doc.title,
        subtitle: doc.subtitle,
        imageUrl: doc.imageUrl,
        linkUrl: doc.linkUrl,
        placement: doc.placement,
        status: doc.status,
        displayStatus,
        startsAt: doc.startsAt.toISOString(),
        endsAt: doc.endsAt.toISOString(),
        priority: doc.priority,
        createdBy: doc.createdBy,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString()
    };
}
const BANNER_PLACEMENT_LABELS = {
    left_primary: 'Left rail — main banner',
    left_secondary: 'Left rail — promo slot',
    right_primary: 'Right rail — main banner',
    right_secondary: 'Right rail — promo slot'
};
}),
"[project]/src/app/api/banners/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/mongodb.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$PromotionBanner$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/models/PromotionBanner.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$banners$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/banners.ts [app-route] (ecmascript)");
;
;
;
;
async function GET() {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["connectToDatabase"])();
        const now = new Date();
        const banners = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$PromotionBanner$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PromotionBannerModel"].find({
            status: 'active'
        }).sort({
            priority: -1,
            createdAt: -1
        });
        const visible = banners.filter((b)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$banners$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isBannerPubliclyVisible"])(b, now));
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            banners: visible.map(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$banners$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toPublicBanner"])
        });
    } catch (err) {
        console.error('[/api/banners GET]', err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Internal server error'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__5887b372._.js.map