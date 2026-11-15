# LMS lift B2: screenshots (D-156)

Every state of `/course`, `/course/:week`, `/skill-library` and `/skill-library/:slug`, at 390 and 1280 CSS px, in the light and dark themes, from the Vite dev server with `/api` answered in the browser by route interception. The course is the real `courseContent()` and `acceleratorSessions()` from `@ai/core`; the guided setup is the real export of `appointment-follow-up`; the library is a sample covering open, locked, upcoming and Free skills. No real account and no production data. Full-page captures, with reduced motion so no hover lift or spinner frame is caught mid-move.

Files are `<state>-<theme>-<width>.jpg`. These images live only in this commit; the next commit removes them, so none merges into `main`.

## Before (`origin/main`, left) and after (right)

| | 390 | 1280 |
|---|---|---|
| `/course`, light | ![course light 390](compare-course-light-390.jpg) | ![course light 1280](compare-course-light-1280.jpg) |
| `/course`, dark | ![course dark 390](compare-course-dark-390.jpg) | ![course dark 1280](compare-course-dark-1280.jpg) |
| `/skill-library`, light | ![library light 390](compare-library-light-390.jpg) | ![library light 1280](compare-library-light-1280.jpg) |
| `/skill-library`, dark | ![library dark 390](compare-library-dark-390.jpg) | ![library dark 1280](compare-library-dark-1280.jpg) |

## Every state, after

### `course`: `/course`

The AI Accelerator overview, every section.

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![course light 390](course-light-390.jpg) | ![course dark 390](course-dark-390.jpg) | ![course light 1280](course-light-1280.jpg) | ![course dark 1280](course-dark-1280.jpg) |

### `course-week`: `/course/week-1`

A lesson page.

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![course-week light 390](course-week-light-390.jpg) | ![course-week dark 390](course-week-dark-390.jpg) | ![course-week light 1280](course-week-light-1280.jpg) | ![course-week dark 1280](course-week-dark-1280.jpg) |

### `course-week-preview`: `/course/week-3`

A lesson page with the staff-preview tag.

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![course-week-preview light 390](course-week-preview-light-390.jpg) | ![course-week-preview dark 390](course-week-preview-dark-390.jpg) | ![course-week-preview light 1280](course-week-preview-light-1280.jpg) | ![course-week-preview dark 1280](course-week-preview-dark-1280.jpg) |

### `course-not-found`: `/course/week-42`

An unknown week: the overview with its note.

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![course-not-found light 390](course-not-found-light-390.jpg) | ![course-not-found dark 390](course-not-found-dark-390.jpg) | ![course-not-found light 1280](course-not-found-light-1280.jpg) | ![course-not-found dark 1280](course-not-found-dark-1280.jpg) |

### `course-loading`: `/course`

Loading.

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![course-loading light 390](course-loading-light-390.jpg) | ![course-loading dark 390](course-loading-dark-390.jpg) | ![course-loading light 1280](course-loading-light-1280.jpg) | ![course-loading dark 1280](course-loading-dark-1280.jpg) |

### `course-signed-out`: `/course`

Signed out (401).

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![course-signed-out light 390](course-signed-out-light-390.jpg) | ![course-signed-out dark 390](course-signed-out-dark-390.jpg) | ![course-signed-out light 1280](course-signed-out-light-1280.jpg) | ![course-signed-out dark 1280](course-signed-out-dark-1280.jpg) |

### `course-locked`: `/course`

Not in your plan (403).

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![course-locked light 390](course-locked-light-390.jpg) | ![course-locked dark 390](course-locked-dark-390.jpg) | ![course-locked light 1280](course-locked-light-1280.jpg) | ![course-locked dark 1280](course-locked-dark-1280.jpg) |

### `course-paused`: `/course`

Paused until a payment goes through (403, D-143).

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![course-paused light 390](course-paused-light-390.jpg) | ![course-paused dark 390](course-paused-dark-390.jpg) | ![course-paused light 1280](course-paused-light-1280.jpg) | ![course-paused dark 1280](course-paused-dark-1280.jpg) |

### `course-upcoming`: `/course`

Bought, opening at the first build (403, D-153).

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![course-upcoming light 390](course-upcoming-light-390.jpg) | ![course-upcoming dark 390](course-upcoming-dark-390.jpg) | ![course-upcoming light 1280](course-upcoming-light-1280.jpg) | ![course-upcoming dark 1280](course-upcoming-dark-1280.jpg) |

### `course-failed`: `/course`

Failed (500).

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![course-failed light 390](course-failed-light-390.jpg) | ![course-failed dark 390](course-failed-dark-390.jpg) | ![course-failed light 1280](course-failed-light-1280.jpg) | ![course-failed dark 1280](course-failed-dark-1280.jpg) |

### `library`: `/skill-library`

Open, locked, upcoming and Free skills in all three sets, with the course and Team Hub buttons.

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![library light 390](library-light-390.jpg) | ![library dark 390](library-dark-390.jpg) | ![library light 1280](library-light-1280.jpg) | ![library dark 1280](library-dark-1280.jpg) |

### `library-group`: `/skill-library`

An access group's member: the welcome, the included note, a locked row's 'Not included'.

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![library-group light 390](library-group-light-390.jpg) | ![library-group dark 390](library-group-dark-390.jpg) | ![library-group light 1280](library-group-light-1280.jpg) | ![library-group dark 1280](library-group-dark-1280.jpg) |

### `library-paused`: `/skill-library`

Paused (D-143).

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![library-paused light 390](library-paused-light-390.jpg) | ![library-paused dark 390](library-paused-dark-390.jpg) | ![library-paused light 1280](library-paused-light-1280.jpg) | ![library-paused dark 1280](library-paused-dark-1280.jpg) |

### `library-prelaunch`: `/skill-library`

Bought, opening at the first build (D-153).

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![library-prelaunch light 390](library-prelaunch-light-390.jpg) | ![library-prelaunch dark 390](library-prelaunch-dark-390.jpg) | ![library-prelaunch light 1280](library-prelaunch-light-1280.jpg) | ![library-prelaunch dark 1280](library-prelaunch-dark-1280.jpg) |

### `library-empty`: `/skill-library`

Signed in with no plan: empty.

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![library-empty light 390](library-empty-light-390.jpg) | ![library-empty dark 390](library-empty-dark-390.jpg) | ![library-empty light 1280](library-empty-light-1280.jpg) | ![library-empty dark 1280](library-empty-dark-1280.jpg) |

### `library-loading`: `/skill-library`

Loading.

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![library-loading light 390](library-loading-light-390.jpg) | ![library-loading dark 390](library-loading-dark-390.jpg) | ![library-loading light 1280](library-loading-light-1280.jpg) | ![library-loading dark 1280](library-loading-dark-1280.jpg) |

### `library-signed-out`: `/skill-library`

Signed out (401).

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![library-signed-out light 390](library-signed-out-light-390.jpg) | ![library-signed-out dark 390](library-signed-out-dark-390.jpg) | ![library-signed-out light 1280](library-signed-out-light-1280.jpg) | ![library-signed-out dark 1280](library-signed-out-dark-1280.jpg) |

### `library-failed`: `/skill-library`

Failed (500).

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![library-failed light 390](library-failed-light-390.jpg) | ![library-failed dark 390](library-failed-dark-390.jpg) | ![library-failed light 1280](library-failed-light-1280.jpg) | ![library-failed dark 1280](library-failed-dark-1280.jpg) |

### `guide`: `/skill-library/appointment-follow-up`

An open guided setup: the app switch, the steps, the open step, the prompts.

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![guide light 390](guide-light-390.jpg) | ![guide dark 390](guide-dark-390.jpg) | ![guide light 1280](guide-light-1280.jpg) | ![guide dark 1280](guide-dark-1280.jpg) |

### `guide-locked`: `/skill-library/appointment-follow-up`

Locked: the steps titles and See Plans.

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![guide-locked light 390](guide-locked-light-390.jpg) | ![guide-locked dark 390](guide-locked-dark-390.jpg) | ![guide-locked light 1280](guide-locked-light-1280.jpg) | ![guide-locked dark 1280](guide-locked-dark-1280.jpg) |

### `guide-member`: `/skill-library/appointment-follow-up`

Locked for an access group's member: 'Not included'.

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![guide-member light 390](guide-member-light-390.jpg) | ![guide-member dark 390](guide-member-dark-390.jpg) | ![guide-member light 1280](guide-member-light-1280.jpg) | ![guide-member dark 1280](guide-member-dark-1280.jpg) |

### `guide-upcoming`: `/skill-library/appointment-follow-up`

Opening on a date.

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![guide-upcoming light 390](guide-upcoming-light-390.jpg) | ![guide-upcoming dark 390](guide-upcoming-dark-390.jpg) | ![guide-upcoming light 1280](guide-upcoming-light-1280.jpg) | ![guide-upcoming dark 1280](guide-upcoming-dark-1280.jpg) |

### `guide-missing`: `/skill-library/no-such-skill`

Not found (404).

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![guide-missing light 390](guide-missing-light-390.jpg) | ![guide-missing dark 390](guide-missing-dark-390.jpg) | ![guide-missing light 1280](guide-missing-light-1280.jpg) | ![guide-missing dark 1280](guide-missing-dark-1280.jpg) |

### `guide-loading`: `/skill-library/appointment-follow-up`

Loading.

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![guide-loading light 390](guide-loading-light-390.jpg) | ![guide-loading dark 390](guide-loading-dark-390.jpg) | ![guide-loading light 1280](guide-loading-light-1280.jpg) | ![guide-loading dark 1280](guide-loading-dark-1280.jpg) |

### `guide-failed`: `/skill-library/appointment-follow-up`

Failed (500).

| light 390 | dark 390 | light 1280 | dark 1280 |
|---|---|---|---|
| ![guide-failed light 390](guide-failed-light-390.jpg) | ![guide-failed dark 390](guide-failed-dark-390.jpg) | ![guide-failed light 1280](guide-failed-light-1280.jpg) | ![guide-failed dark 1280](guide-failed-dark-1280.jpg) |
