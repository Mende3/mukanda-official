import { extname } from 'path'

export function buildProductImageKey(
    userEmail: string,
    productId: string,
    originalname: string,
): string {
    const ext = extname(originalname).toLowerCase()
    return `${userEmail}/produtos/${productId}_img${ext}`
}

export function buildRuleFlyerKey(
    userEmail: string,
    ruleId: string,
    originalname: string,
): string {
    const ext = extname(originalname).toLowerCase()
    return `${userEmail}/campanhas/${ruleId}_flyer${ext}`
}

export function buildLogoKey(
    userEmail: string,
    businessId: string,
    originalname: string,
): string {
    const ext = extname(originalname).toLowerCase()
    return `${userEmail}/logos/${businessId}_logo${ext}`
}

// ─── Extensões possíveis (para delete sem extensão conhecida) ─────────────────

export const POSSIBLE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']