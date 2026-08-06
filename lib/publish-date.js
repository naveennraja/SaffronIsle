// @ts-check
/**
 * Whether an article's publish date has arrived.
 *
 * Scheduling reuses the existing `date` frontmatter field rather than adding a
 * second one: a date in the future means "written but not yet published". That
 * keeps one date per article, so the day it goes live is also the day it claims
 * to have been published, and existing articles need no migration.
 *
 * HOW SCHEDULING ACTUALLY TAKES EFFECT
 *
 * This site is statically generated — every page is rendered to HTML at build
 * time and served from a CDN. There is no server deciding visibility per
 * request, so this filter runs *during the build*, and a scheduled article
 * appears only when a build happens after its date. That is what the daily
 * workflow is for; without a rebuild, nothing changes no matter what the date
 * says.
 *
 * Dates are compared as YYYY-MM-DD strings, which sort correctly on their own,
 * avoiding Date parsing and its timezone surprises entirely.
 *
 * CommonJS to match the other shared modules: lib/articles.ts imports it and
 * the scheduling script requires it.
 */

/** The author and the audience are both in Ireland, so "today" means today there. */
const SITE_TIME_ZONE = 'Europe/Dublin'

/**
 * Today's date in the site's timezone, as YYYY-MM-DD.
 *
 * en-CA formats as YYYY-MM-DD, which is what the frontmatter uses. Doing this
 * in the site's zone rather than UTC matters around midnight: a build at
 * 01:00 UTC in summer is already 02:00 in Dublin, and using UTC would let an
 * article scheduled for the 10th appear on the 9th for part of the year.
 *
 * @param {Date} [now]
 */
function todayInSiteZone(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SITE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/**
 * True when `date` is today or earlier — i.e. the article should be live.
 *
 * A missing or unparseable date is treated as published. Hiding an article
 * because its date looks odd would be a silent, hard-to-diagnose disappearance;
 * lib/articles.ts already validates that `date` is present, so this is a
 * fallback rather than the main guard.
 *
 * @param {string} date  YYYY-MM-DD (extra time component is ignored)
 * @param {string} [today]
 */
function isPublished(date, today = todayInSiteZone()) {
  if (typeof date !== 'string') return true
  const day = date.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return true
  return day <= today
}

/**
 * True when `date` falls exactly on `today` — the article is going live in this
 * build and was not live before it. Used by the scheduling workflow to decide
 * whether a rebuild is needed at all.
 *
 * @param {string} date
 * @param {string} [today]
 */
function isDueToday(date, today = todayInSiteZone()) {
  return typeof date === 'string' && date.slice(0, 10) === today
}

module.exports = { SITE_TIME_ZONE, todayInSiteZone, isPublished, isDueToday }
