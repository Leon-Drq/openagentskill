import type { Locale } from '@/lib/i18n/config'

const messages: Record<string, [string, string]> = {
  copy_manually: ['Clipboard access is unavailable. Select and copy the text above.', '浏览器未允许自动复制，请选中上方正文手动复制。'],
  checkout_unavailable: ['Checkout is being connected. No payment is collected yet.', '支付接入中，目前不会收取费用。'],
  package_unavailable: ['Delivery is temporarily unavailable. Please try again shortly.', '交付内容暂时不可用，请稍后重试。'],
  temporarily_unavailable: ['This service is temporarily unavailable. Please try again shortly.', '服务暂时不可用，请稍后重试。'],
  already_purchased: ['You already have access. Open your purchases to download.', '你已拥有访问权限，请前往我的购买下载。'],
  purchase_required: ['No active purchase was found for this Skill. Check your purchases or membership.', '当前账号没有此 Skill 的有效购买权限，请检查订单或会员状态。'],
  subscription_exists: ['You already have a subscription. Manage it in your purchases.', '你已有订阅，请在我的购买中管理。'],
  other_checkout_pending: ['Another billing cycle has an open checkout. Cancel that pending order in your purchases before switching.', '另一付款周期有待支付订单，请先在我的购买中取消该订单，再切换周期。'],
  payment_processing: ['Payment is still being confirmed. Check your purchases shortly.', '支付结果正在确认，请稍后刷新我的购买。'],
  checkout_expired: ['This checkout has expired. Refresh and try again.', '结算已过期，请刷新后重试。'],
  sign_in_required: ['Sign in to access your purchases.', '请登录后查看购买记录。'],
  no_billing_account: ['No billing account was found. It is created when you start checkout.', '尚无付款账户，发起结算后将自动创建。'],
}
export function paymentMessage(code: string, locale: Locale) {
  return (messages[code] || messages.temporarily_unavailable)[locale === 'zh' ? 1 : 0]
}
