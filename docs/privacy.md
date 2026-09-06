# Privacy Policy — Restock

**Last updated: 5 September 2026**

Restock is a shared inventory for households, flatshares and associations. This
document says exactly what data the app keeps, why, who sees it, and how to make
it go away.

> **To fill in before publishing** — the identity of the data controller and a
> contact address are required and cannot be guessed:
>
> - Data controller: `<name or company>`, `<postal address>`
> - Contact: `<email address>`

---

## What Restock keeps

### What you give

| Data | Why | Required |
|---|---|---|
| **Your name** | Shown under every take and every restock, so the household knows who did what | Yes |
| **Your email** | It is your sign-in identifier, and where a code is sent if you forget your password | Yes |
| **Your password** | Never stored as such: only a bcrypt hash is kept, from which the password cannot be recovered | Yes |
| **A notification token** | To tell your household when something runs out | No — only if you accept notifications |

### What your use produces

- **Your group**: which one, your role, and since when you have been in it.
- **Your shelf**: the names of the things the household tracks, their
  quantities, their units.
- **Your shopping list**: what is added, what is checked off, and by whom.
- **Your recipes**: the ones the group keeps, with their source.
- **The log**: who took or restocked what, when, and how much.
- **Your sessions**: sign-in tokens, stored as hashes, so you do not retype your
  password every time you open the app.

### What Restock does not collect

No analytics, no advertising tracker, no advertising identifier, no location, no
access to your contacts, no profiling. The app ships with no analytics tool. It
neither sells nor rents any data — there is no commercial recipient.

---

## Who sees your data

### The other members of your group

This is the most important point, because it is what a shared inventory is. The
members of your group see:

- **your name and your email**, in the member list;
- **everything you take and restock**, in the group log, with the date and the
  quantity.

The log is open to every member, not only to admins: a register only admins can
read proves nothing to the people who are meant to rely on it. If that does not
suit you, do not join a shared group — Restock has a solo mode that shares
nothing.

### Technical providers

| Who | What they receive | Why |
|---|---|---|
| **The server host** (Render, Frankfurt region) | All of the above, since it hosts the database | Running the service |
| **Expo's notification service** | Your notification token, and the message text | Sending notifications. The message contains **only the item name** — "Coffee ran out" — never a member's name |
| **The email provider** | Your email address and the recovery code | Only for "forgot password". No other email is sent |
| **Wikibooks (Wikimedia)** | The words you type when searching for a recipe | Finding recipes. The request leaves **from our server**, not from your phone: Wikimedia sees neither your IP address nor your account |

No other recipient.

### Authorities

Your data is disclosed to a third party only where the law requires it.

---

## For how long

| Data | Duration |
|---|---|
| Your account and its contents | As long as the account exists |
| A password recovery code | 15 minutes, then erased |
| A long session | 60 days without use, then erased |
| Log entries | As long as the group exists — see below |

---

## Deleting your account

From the app: **Settings → Edit my account → Delete my account**. No conditions, no
approval to ask for. Even if you are the only admin of your group: someone else
automatically takes over your place.

What goes immediately and for good:

- your name,
- your email,
- your password hash,
- your notification token,
- every open session.

**What stays, and why.** The log entries you produced remain, but **without your
name**: they appear as actions with no author. This is a deliberate choice.
Erasing them would tear a hole in the other members' register, which they use to
know where the stock stands and who restocked what; keeping them under your name
would preserve personal data after you left. Once anonymised, those entries can
no longer identify you.

If you were alone in your group, the group and its shelf go with you.

You can sign up again afterwards with the same email address: a deletion is not
a ban.

---

## Your rights

European data protection law gives you the right to access your data, correct
it, erase it, restrict its processing, object to it, and obtain a portable copy.

In practice, in Restock:

- **Access and copy** — the group log exports to CSV from the Log tab. For
  anything else, write to the contact address.
- **Correction** — your name and email can be changed in "Edit my account".
- **Erasure** — see "Deleting your account" above.
- **Complaint** — you may lodge a complaint with your national data protection
  authority (in France, the CNIL, `cnil.fr`) if you believe your rights are not
  being respected.

---

## Minors

Restock is not aimed at children and asks them nothing in particular. If you are
a minor, ask your parents before creating an account.

---

## Security

Passwords are stored as bcrypt hashes, never in clear text. Recovery codes are
too. Session tokens are stored as hashes rather than as such. Traffic between
the app and the server goes over HTTPS. Changing your password closes every
session opened with the old one.

No system is infallible: we cannot guarantee absolute security.

---

## Changes

This policy may change along with the app. The date at the top says which
version you are reading. A change that genuinely affects you will be flagged in
the app.
