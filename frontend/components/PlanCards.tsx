type PlanCard = {
  key: string;
  planName: 'Basic' | 'Premium';
  billing: '月額' | '年間';
  priceMain: string;
  priceSub?: string;
  badge?: string;
  description: string;
  href: string;
  theme: 'indigo' | 'purple';
};

const PLANS: PlanCard[] = [
  {
    key: 'basic-monthly',
    planName: 'Basic',
    billing: '月額',
    priceMain: '¥2,980',
    priceSub: '/月',
    description: '月額制のプランです。いつでもキャンセル可能です。',
    href: 'https://buy.stripe.com/test_28E3cvf9pcSd69x0BS5gc00',
    theme: 'indigo',
  },
  {
    key: 'basic-yearly',
    planName: 'Basic',
    billing: '年間',
    priceMain: '¥29,800',
    priceSub: '/年',
    badge: 'お得',
    description: '1年分をまとめて購入。月額より約17%お得です。',
    href: 'https://buy.stripe.com/5kQ5kD0ev8BX41pbgw5gc01',
    theme: 'indigo',
  },
  {
    key: 'premium-monthly',
    planName: 'Premium',
    billing: '月額',
    priceMain: '¥4,980',
    priceSub: '/月',
    description: '月額制のプランです。いつでもキャンセル可能です。',
    href: 'https://buy.stripe.com/00w28rd1h9G1eG3bgw5gc02',
    theme: 'purple',
  },
  {
    key: 'premium-yearly',
    planName: 'Premium',
    billing: '年間',
    priceMain: '¥49,800',
    priceSub: '/年',
    badge: 'お得',
    description: '1年分をまとめて購入。月額より約17%お得です。',
    href: 'https://buy.stripe.com/9B65kD1izg4p55t84k5gc03',
    theme: 'purple',
  },
];

function themeClasses(theme: PlanCard['theme']) {
  if (theme === 'indigo') {
    return {
      border: 'border-indigo-200 hover:border-indigo-400',
      pillBg: 'bg-indigo-100',
      pillText: 'text-indigo-700',
      price: 'text-indigo-600',
      button: 'bg-indigo-600 hover:bg-indigo-700',
      badge: 'bg-emerald-500',
    };
  }

  return {
    border: 'border-purple-200 hover:border-purple-400',
    pillBg: 'bg-purple-100',
    pillText: 'text-purple-700',
    price: 'text-purple-600',
    button: 'bg-purple-600 hover:bg-purple-700',
    badge: 'bg-emerald-500',
  };
}

export function PlanCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {PLANS.map((p) => {
        const t = themeClasses(p.theme);
        return (
          <div
            key={p.key}
            className={`bg-white border-2 rounded-xl p-6 transition-all relative ${t.border}`}
          >
            {p.badge && (
              <div className={`absolute top-4 right-4 px-2 py-1 text-white text-xs font-bold rounded ${t.badge}`}>
                {p.badge}
              </div>
            )}

            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xl font-bold text-gray-900">{p.planName} プラン</h4>
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${t.pillBg} ${t.pillText}`}>
                {p.billing}
              </span>
            </div>

            <div className="mb-3">
              <span className={`text-3xl font-black ${t.price}`}>{p.priceMain}</span>
              {p.priceSub && <span className="text-gray-600 text-sm ml-2">{p.priceSub}</span>}
              {p.key === 'basic-yearly' && (
                <div className="text-xs text-emerald-600 font-semibold mt-1">(月額 ¥2,483相当)</div>
              )}
              {p.key === 'premium-yearly' && (
                <div className="text-xs text-emerald-600 font-semibold mt-1">(月額 ¥4,150相当)</div>
              )}
            </div>

            <p className="text-sm text-gray-600 mb-4">{p.description}</p>

            <a
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`block w-full px-6 py-3 text-white font-bold rounded-lg transition-colors text-center ${t.button}`}
            >
              {p.planName} {p.billing}プランを選択
            </a>
          </div>
        );
      })}
    </div>
  );
}

