# Follow Up Boss Exports, and What Follow Up Boss and Sisu Already Show

Last verified: 2026-11-10, against Follow Up Boss's help center (help.followupboss.com), Sisu's knowledge base (kb.sisu.co) and Follow Up Boss's Sisu integration page. Follow Up Boss's help center blocks automated page reads, so its articles were read through search excerpts on 2026-11-10; the export steps also match what this library's Database Health Check checked on 2026-11-08. Sources are at the end. Follow Up Boss changes its screens often: when a click path here and the user's screen disagree, trust the screen and say so.

## This Week's People Export (Required)

- **Who can export:** the Account Owner, and any user the owner gives Can Export (Admin > Team, the Can Export checkbox). Exporting respects each user's role: an agent's export holds only the people that agent can see, so run it as the owner or an admin for the whole team. The owner gets an email each time anyone exports. Exporting never changes or removes anyone.
- **Before exporting, turn on the columns the review reads.** On People, open the Columns menu (upper right) and check Stage, Source, Agent, Created, Last Communication, Last Activity and Tags. Follow Up Boss's People screen offers these as columns (People Overview; a Follow Up Boss help article on one coach's Smart Lists lists Stage, Last Activity, Last Communication, Agent, Pond and Created among its columns).
- **Steps:** People > All People (or a Smart List that holds the whole pipeline), check the box next to Name and choose Select All, click Export (the downward arrow), check Export All Columns, then Yes, Export People. A CSV downloads at once.
- **What Export All Columns holds** (the help center's list): Date Added, Name, First Name, Last Name, Stage, Lead Source, Assigned To, Last Assigned, Is Contacted, Listing Price, Tags, Email 1 to 6, Timeframe, Phone 1 to 6, addresses, property fields, Message, Description, Notes, Calls, Texts, Background, Deal Stage, Deal Close Date, Deal Price, campaign fields and custom fields. Without Export All Columns, the file holds the name plus the exportable columns turned on in the current view, and the first phone, email and address.
- **Not confirmed:** whether Last Communication and Last Activity come through with Export All Columns. They are People-view columns and Smart List filters, not on the help center's export list. If the file has no Last Communication column, export again without Export All Columns after turning those columns on in the view. The review says plainly when the column is missing and what it couldn't do without it.
- **No record ID.** The help center lists no ID column. The review matches the same person across two weeks by email, then phone, then name, and never shows the email or phone.
- **Ponds:** pond leads export under the pond's lead agent, and the pond name is left out. When one agent's count looks high, say this.

## A Deals Report Export (When the Team Uses Follow Up Boss Deals)

- **Steps:** Reporting, the Deals report, then in the upper right set Users, Time Frame and Filters (Pipeline, Status, Source, Users). Use + Add Columns under the report graph to add columns, click the export icon, choose the columns and export to CSV. The CSV keeps the column order of the report page. The same Can Export permission applies.
- **Columns the help center lists:** Name, Stage, Status (All Deals, Current Deals or Archived), Entered Stage (the date the deal entered its stage), Time in Stage (days), Close Date and Team. Search excerpts of the same article also list Price, Commission, Agent Commission and Team Commission. Add Price if it isn't on.
- **Pipeline** is a filter on the report; whether it can be a column is not confirmed. Without a Pipeline column, the review counts buyer and seller deals together. To keep them apart, export each pipeline separately.
- **Close Date** on a deal that isn't closed is the date the team expects it to close (Follow Up Boss's API calls the field the projected close date). Deal stages are the team's own: the Account Owner sets pipelines and stages (Admin > Deals, the settings gear). Follow Up Boss starts every account with a Buyers and a Sellers pipeline.
- **The People export's deal columns:** Deal Stage, Deal Close Date and Deal Price hold one deal per person. When several of a person's deals match a People filter, Follow Up Boss shows the one with the closest upcoming close date. Without a Deals export, the review uses these columns for list 1 and says so.

## Last Week's People Export (to See What Moved)

The same export, saved last week. Follow Up Boss keeps no weekly snapshot of everyone's stage, so the only way to compare is to keep last week's file. Each week, save the export with the date in its name (for example, "FUB People 2026-11-10.csv") and attach it next week.

## Follow Up Boss Facts the Review Relies On

- **Default stages** (Changing a Lead Stage): Lead (not spoken to yet; the default for new people), Attempted Contact, Spoke with Customer, Appointment Set, Met with Customer, Showing Homes, Listing Agreement, Active Listing, Submitting Offers, Under Contract (offer accepted), Nurture, Rejected, Closed (closed deal or post-closing), Trash. Lead, Closed and Trash are system stages. Only the Account Owner creates, renames or deletes stages (Admin > Stages). Teams often add stages such as Pending, Past Client or Sphere.
- **Last Communication** is the latest call, email, text, Zillow message or Inbox App conversation logged in Follow Up Boss (Filter Definitions). Calls and texts from an agent's personal phone don't show unless someone logs them, so "no communication logged" means nothing is logged in Follow Up Boss, not that nobody talked.
- **Last Activity** is the lead's own last activity: inquiries and property searches (Filter Definitions). It is never the agent's outreach.
- **Smart Lists:** People > All People > Filters, add filters, then + New List, name it, choose who to share it with, Save List. Sharing a list shares the filters, not the people: each agent sees only the matching people they can already see. Filter conditions include "was more than" (minutes to years) and "is empty."

## What Follow Up Boss Reporting and Sisu Already Show

Don't rebuild these. Say which one a team already has when it answers the question better.

- **Follow Up Boss Reporting:** the Agent Activity report (team performance by agent, counting new, initially assigned and currently assigned leads; action plan follow-up isn't counted); the Lead Source report (speed to action, first call, first text and first email by source, and "which lead source has the most closed deals," with Deals Closed, Deal Value, Deal Commission and Conversion Rate); the Appointment report (appointments that occurred, by user, type and outcome); the Deals report (each deal's stage, Entered Stage, Time in Stage and Close Date); the Deals Leaderboard (closed deals in the chosen pipelines); and closed deal reporting by agent. The Deals screen shows the total value of deals in each stage, close dates and total commission.
- **Follow Up Boss default Smart Lists:** Met/Appt Set (Stage includes Met with Customer and Appointment Set, Last Communication more than 6 days ago), Revived Prospects, Under Contract, Past Clients (Stage includes Closed, Last Communication more than 90 days ago) and others.
- **Sisu,** with its Follow Up Boss integration: pulls calls, texts, emails, conversations and new leads from Follow Up Boss into dashboards measured against goals; turns a deal created in Follow Up Boss in the Sisu Buyer or Sisu Seller pipeline into a Sisu transaction; and reports lead source effectiveness and return. The integration syncs in a nightly batch (about 2 AM, per Sisu's setup article) and needs the Account Owner's API key.

**What this review adds:** one named, dated list of what needs a decision this week across every agent, built from the export's own fields; aging worked out per record with the arithmetic shown; deals past their close date tied to the person and their last communication; last week against this week, person by person (no Follow Up Boss report keeps that snapshot); questions for each agent for the meeting; and odd rows flagged, never fixed. Its conversion table is a snapshot by current stage for the meeting. For official closed-deal conversion and lead source return, the Lead Source report and Sisu stay the source of record.

## Sources

Follow Up Boss help center, read through search excerpts on 2026-11-10 (an article's own last-updated date in parentheses where known):
- Export Contacts to a Spreadsheet (2026-04-21): https://help.followupboss.com/hc/en-us/articles/360015269133-Export-Contacts-to-a-Spreadsheet
- Exporting reports to a spreadsheet: https://help.followupboss.com/hc/en-us/articles/8897311199511-Exporting-reports-to-a-spreadsheet
- Deals Report: https://help.followupboss.com/hc/en-us/articles/360047800793-Deals-Report
- Creating Deals: https://help.followupboss.com/hc/en-us/articles/360015220774-Creating-Deals
- Deals Leaderboard: https://help.followupboss.com/hc/en-us/articles/4402383606039-Deals-Leaderboard
- People Overview (2025-03-06): https://help.followupboss.com/hc/en-us/articles/360018115954-People-Overview
- Gabe Cordova's Smart Lists: https://help.followupboss.com/hc/en-us/articles/4408794102423-Gabe-Cordova-s-Smart-Lists
- Filter Definitions (2026-07-22): https://help.followupboss.com/hc/en-us/articles/360025651313-Filter-Definitions
- Lead Profile Overview: https://help.followupboss.com/hc/en-us/articles/9538400649495-Lead-Profile-Overview
- Changing a Lead Stage (2026-07-06): https://help.followupboss.com/hc/en-us/articles/360012456793-Changing-a-Lead-Stage
- Smart Lists Overview (2026-07-22): https://help.followupboss.com/hc/en-us/articles/1500008374882-Smart-Lists-Overview
- Default Smart Lists (2026-07-22): https://help.followupboss.com/hc/en-us/articles/4420635737239-Default-Smart-Lists
- Users, Roles & Permissions (2025-09-25): https://help.followupboss.com/hc/en-us/articles/4402370636567-Users-Roles-Permissions
- Agent activity report: https://help.followupboss.com/hc/en-us/articles/360014693073-Agent-activity-report
- Speed to lead & lead source report: https://help.followupboss.com/hc/en-us/articles/9229981219351-Lead-Source-Report
- Closed Deal Report by Lead Source: https://help.followupboss.com/hc/en-us/articles/360014628574-Closed-Deal-Report-by-Lead-Source
- Appointment Report: https://help.followupboss.com/hc/en-us/articles/9228360927383-Appointment-Report
- Closed deal reporting by agent: https://help.followupboss.com/hc/en-us/articles/360014718373-Closed-deal-reporting-by-agent
- Lead Ponds Overview (2024-11-15): https://help.followupboss.com/hc/en-us/articles/360048829034-Lead-Ponds-Overview
- Follow Up Boss API, deals (projectedCloseDate): https://docs.followupboss.com/reference/deals-post

Sisu, checked 2026-11-10:
- Setting up the Follow Up Boss integration: https://kb.sisu.co/en/articles/8380608-setting-up-the-follow-up-boss-integration
- Ins and outs of the Follow Up Boss integration: https://kb.sisu.co/en/articles/8400470-ins-outs-of-the-follow-up-boss-integration
- Follow Up Boss's Sisu integration page: https://followupboss.com/integrations/sisu

Third party, checked 2026-11-10: Bramlett Partners' Follow Up Boss classes page notes that calls and texts from a personal phone aren't tracked unless logged: https://support.bramlettpartners.com/article/820-2026-fub-classes

Not confirmed here (say "confirm with Follow Up Boss support" if it matters): whether Last Communication and Last Activity come through with Export All Columns; whether Pipeline can be a Deals report column; the Deals report's exact header for its price column; Follow Up Boss's own conversion rate formula.
