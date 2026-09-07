import React, { useState } from 'react';
import { Check, Zap, Shield, Globe, Server, ArrowRight, ChevronDown, ChevronUp, Star } from 'lucide-react';

interface Plan {
  id: string;
  tier: string;
  recommended?: boolean;
  available?: boolean;
  price: string;
  period: string;
  tagline: string;
  cta: string;
  ctaStyle: 'outline' | 'primary' | 'enterprise';
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: 'free',
    tier: 'Free',
    price: '$0',
    period: '/month',
    tagline: 'For solo projects',
    cta: 'Get Started →',
    ctaStyle: 'outline',
    features: [
      '1 workspace',
      '2vCPU / 4GB RAM',
      '100 AI requests/month',
      'Public editor only',
      'Community support',
    ],
  },
  {
    id: 'pro',
    tier: 'Pro',
    recommended: true,
    price: '$19',
    period: '/monthly • Billed monthly',
    tagline: 'For active developers & fast-moving small teams doing serious work.',
    cta: 'Start Free Trial →',
    ctaStyle: 'primary',
    features: [
      'Unlimited workspaces',
      'Full AI assistant',
      'Remote control sessions',
      'Team chat (10 members)',
      'Priority support',
    ],
  },
  {
    id: 'enterprise',
    tier: 'Enterprise',
    available: true,
    price: '$49',
    period: '/per seat/month',
    tagline: "For enterprise teams handling customer-critical AI workflows.",
    cta: '→ Contact Sales',
    ctaStyle: 'enterprise',
    features: [
      'Everything in Pro',
      'Private model cluster',
      'Unlimited team members',
      'SOC & security audit',
      'Dedicated support',
    ],
  },
];

const COMPLIANCE_BADGES = [
  { label: 'SOC2', sublabel: 'Type II Certified' },
  { label: 'HIPAA', sublabel: 'Compliant Infrastructure' },
  { label: '99.99%', sublabel: 'Uptime SLA' },
  { label: '0-Retention', sublabel: 'Data Privacy Mode' },
];

const FAQS = [
  {
    q: "Can I upgrade or downgrade between plans at any time?",
    a: "Yes. Plan changes take effect immediately. If you upgrade mid-cycle, we prorate the charge. If you downgrade, the change applies at the next billing date.",
  },
  {
    q: "Does Codeplane train AI models on my proprietary code?",
    a: "Never. Your code stays private. Codeplane-4o runs inference only. We never store or train on customer code unless you explicitly opt in for fine-tuning.",
  },
  {
    q: "What happens when I hit my monthly AI inference limit?",
    a: "You'll receive a warning at 80% usage. Once the limit is reached, AI features pause until the next billing cycle or until you upgrade.",
  },
  {
    q: "How do custom VPC and on-premise Enterprise setups work?",
    a: "Enterprise plans support VPC peering, on-premise deployment via Docker/Kubernetes, and custom SSO. Talk to our engineering team to spec the right architecture.",
  },
];

export const PricingPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleGetStarted = (planId: string) => {
    setSelectedPlan(planId);
    // Would navigate to sign-up / checkout in a real app
  };

  return (
    <div className="pricing-page">
      {/* Header */}
      <div className="pricing-hero">
        <div className="pricing-hero-tag">TRANSPARENT CLOUD PRICING</div>
        <h1 className="pricing-hero-title">Simple, honest pricing</h1>
        <p className="pricing-hero-sub">Start free. Scale as you grow.</p>

        {/* Billing toggle */}
        <div className="billing-toggle">
          <button
            className={`billing-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button
            className={`billing-btn ${billingCycle === 'annual' ? 'active' : ''}`}
            onClick={() => setBillingCycle('annual')}
          >
            Annual
            <span className="billing-save-badge">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Tier labels */}
      <div className="pricing-tier-labels">
        <span className="tier-label">TIER 01</span>
        <span className="tier-label recommended-label">TIER 02 · RECOMMENDED</span>
        <span className="tier-label available-label">TIER 03 · AVAILABLE</span>
      </div>

      {/* Plan Cards */}
      <div className="pricing-plans-grid">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`pricing-card ${plan.recommended ? 'recommended' : ''} ${plan.available ? 'enterprise' : ''} ${selectedPlan === plan.id ? 'selected' : ''}`}
          >
            {plan.recommended && (
              <div className="recommended-banner">
                <Star size={11} fill="currentColor" />
                <span>MOST POPULAR</span>
              </div>
            )}

            <div className="plan-header">
              <div className="plan-tier-row">
                <span className="plan-tier">{plan.tier}</span>
                {plan.recommended && <span className="plan-tag recommended-tag">Recommended</span>}
                {plan.available && <span className="plan-tag available-tag">Available</span>}
              </div>
              <div className="plan-price-row">
                <span className="plan-price">{plan.price}</span>
                <span className="plan-period">{plan.period}</span>
              </div>
              <p className="plan-tagline">{plan.tagline}</p>
            </div>

            <div className="plan-features">
              {plan.features.map((feature, i) => (
                <div key={i} className="plan-feature-row">
                  <span className="feature-check">
                    <Check size={12} strokeWidth={2.5} />
                  </span>
                  <span className="feature-text">{feature}</span>
                </div>
              ))}
            </div>

            <button
              className={`plan-cta-btn ${plan.ctaStyle}`}
              onClick={() => handleGetStarted(plan.id)}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Compliance Badges */}
      <div className="compliance-section">
        <div className="compliance-subtitle">SECURITY & COMPLIANCE — Zero-Trust Creatboxes</div>
        <p className="compliance-desc">
          Codeplane workboxes are SOC2 Type II certified infrastructure with automatic end-to-end encrypted peer rings. Your tool chains are never retained or processed after session ends.
        </p>
        <div className="compliance-badges-row">
          {COMPLIANCE_BADGES.map((b) => (
            <div key={b.label} className="compliance-badge">
              <span className="badge-label">{b.label}</span>
              <span className="badge-sublabel">{b.sublabel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Resource Allocation - second pricing tier */}
      <div className="resource-section">
        <div className="resource-header">
          <div className="resource-tag">RESOURCE PLANS</div>
          <h2 className="resource-title">Precision Resource Allocation</h2>
        </div>

        <div className="pricing-tier-labels">
          <span className="tier-label">TIER 01</span>
          <span className="tier-label recommended-label">TIER 02 · RECOMMENDED</span>
          <span className="tier-label available-label">TIER 03 · AVAILABLE</span>
        </div>

        <div className="pricing-plans-grid resource-grid">
          {PLANS.map((plan) => (
            <div
              key={plan.id + '-res'}
              className={`pricing-card resource-card ${plan.recommended ? 'recommended' : ''} ${plan.available ? 'enterprise' : ''}`}
            >
              <div className="plan-header">
                <div className="plan-tier-row">
                  <span className="plan-tier">{plan.tier}</span>
                  {plan.recommended && <span className="plan-tag recommended-tag">Recommended</span>}
                  {plan.available && <span className="plan-tag available-tag">Available</span>}
                </div>
                <div className="plan-price-row">
                  <span className="plan-price">{plan.price}</span>
                  <span className="plan-period">{plan.period}</span>
                </div>
                <p className="plan-tagline">{plan.tagline}</p>
              </div>

              <div className="plan-features">
                {plan.features.map((feature, i) => (
                  <div key={i} className="plan-feature-row">
                    <span className="feature-check"><Check size={12} strokeWidth={2.5} /></span>
                    <span className="feature-text">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                className={`plan-cta-btn ${plan.ctaStyle}`}
                onClick={() => handleGetStarted(plan.id)}
              >
                {plan.id === 'free' ? 'Get Started →' : plan.id === 'pro' ? 'Start Free Trial →' : '→ Contact Sales'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="faq-section">
        <div className="faq-tag">FREQUENTLY ASKED QUESTIONS</div>
        <div className="faq-list">
          {FAQS.map((faq, i) => (
            <div key={i} className={`faq-item ${openFaq === i ? 'open' : ''}`}>
              <button
                className="faq-question"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span>{faq.q}</span>
                {openFaq === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {openFaq === i && (
                <div className="faq-answer">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA Footer */}
      <div className="pricing-cta-footer">
        <h3 className="cta-title">Ready to accelerate your engineering workflow?</h3>
        <div className="cta-actions">
          <button className="cta-primary-btn">
            Create Free Account
            <ArrowRight size={13} />
          </button>
          <button className="cta-secondary-btn">
            Talk with Engineering
          </button>
        </div>
        <p className="cta-footnote">
          © 2025 Codeplane Inc. All rights reserved. Engineered for autonomous cloud devs.
        </p>
      </div>
    </div>
  );
};
