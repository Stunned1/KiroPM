import React, { useState } from 'react'

// ── Mock data ─────────────────────────────────────────────────────────────────
const SYNTHESIS = {
  label: 'DAILY SYNTHESIS',
  headline: ['Users are prioritizing ', 'Faster Onboarding', ' over feature depth.'],
  body: 'Synthesis of 38 recent interviews suggests friction in the first-run experience is the top churn driver. Users cite unclear next steps and missing empty states as blockers.',
}

const STATS = [
  {
    label: 'HEALTH SCORE',
    value: '91.4%',
    sub: 'Retention is up 3% this week.',
    bar: 0.914,
    barColor: '#7c6af7',
  },
  {
    label: 'ACTIVE USERS',
    value: '1,284',
    sub: 'Exceeding monthly target.',
    bar: null,
  },
]

const ISSUES = [
  {
    id: 1,
    title: 'Onboarding drop-off (Step 3)',
    tag: 'High Priority',
    tagColor: '#f87171',
    desc: '62% of new users abandon at the third onboarding step. No clear CTA visible on mobile viewports.',
    time: 'Reported 1h ago',
  },
  {
    id: 2,
    title: 'Schema drift in users table',
    tag: 'Technical Debt',
    tagColor: '#fb923c',
    desc: 'onboarding_step column missing from production. Causes silent failures in the checklist flow.',
    time: 'Reported 4h ago',
  },
]

const TRENDS = [
  { label: 'Onboarding', value: 88, highlight: true },
  { label: 'Search', value: 62 },
  { label: 'Collab', value: 74 },
  { label: 'Mobile', value: 45 },
  { label: 'Export', value: 38 },
]

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ stat }) {
  return (
    <div className="db-stat-card">
      <p className="db-stat-label">{stat.label}</p>
      <p className="db-stat-value">{stat.value}</p>
      {stat.bar !== null && (
        <div className="db-stat-bar-track">
          <div className="db-stat-bar-fill" style={{ width: `${stat.bar * 100}%`, background: stat.barColor }} />
        </div>
      )}
      <p className="db-stat-sub">{stat.sub}</p>
    </div>
  )
}

function IssueCard({ issue }) {
  return (
    <div className="db-issue-card">
      <div className="db-issue-header">
        <span className="db-issue-title">{issue.title}</span>
        <span className="db-issue-tag" style={{ color: issue.tagColor, borderColor: issue.tagColor }}>
          {issue.tag}
        </span>
      </div>
      <p className="db-issue-desc">{issue.desc}</p>
      <div className="db-issue-footer">
        <span className="db-issue-time">{issue.time}</span>
        <span className="db-issue-arrow">›</span>
      </div>
    </div>
  )
}

function TrendsChart({ trends }) {
  const max = Math.max(...trends.map(t => t.value))
  return (
    <div className="db-trends-chart">
      {trends.map(t => (
        <div key={t.label} className="db-trend-col">
          <div className="db-trend-bar-wrap">
            <div
              className="db-trend-bar"
              style={{
                height: `${(t.value / max) * 100}%`,
                background: t.highlight ? 'rgba(124,106,247,0.9)' : 'rgba(124,106,247,0.35)',
              }}
            />
          </div>
          <span className="db-trend-label">{t.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function ProjectDashboard({ project }) {
  return (
    <div className="project-dashboard">

      {/* Top row: synthesis + stats */}
      <div className="db-top-row">
        <div className="db-synthesis-card">
          <span className="db-synthesis-label">{SYNTHESIS.label}</span>
          <h2 className="db-synthesis-headline">
            {SYNTHESIS.headline[0]}
            <span className="db-synthesis-highlight">{SYNTHESIS.headline[1]}</span>
            {SYNTHESIS.headline[2]}
          </h2>
          <p className="db-synthesis-body">{SYNTHESIS.body}</p>
          <div className="db-synthesis-actions">
            <button className="db-btn-outline">View Data Source</button>
            <button className="db-btn-outline">Generate Report</button>
          </div>
        </div>

        <div className="db-stats-col">
          {STATS.map(s => <StatCard key={s.label} stat={s} />)}
        </div>
      </div>

      {/* Bottom row: issues + trends */}
      <div className="db-bottom-row">
        <div className="db-section">
          <div className="db-section-header">
            <span className="db-section-icon">⚠</span>
            <span className="db-section-title">Critical Path Issues</span>
            <span className="db-section-count">{ISSUES.length} Active</span>
          </div>
          <div className="db-issues-list">
            {ISSUES.map(i => <IssueCard key={i.id} issue={i} />)}
          </div>
        </div>

        <div className="db-section">
          <div className="db-section-header">
            <span className="db-section-icon">↗</span>
            <span className="db-section-title">Feature Demand Trends</span>
            <button className="db-section-link">Full Analytics</button>
          </div>
          <TrendsChart trends={TRENDS} />
          <p className="db-trends-footer">
            Top Requested: <strong>Onboarding ({TRENDS[0].value}%)</strong>
            <span className="db-trends-updated">Last updated: just now</span>
          </p>
        </div>
      </div>

    </div>
  )
}
