# Admin Console 1d (D-157): the grouped admin sidebar

From the fixture build on `/admin/audit`, with `?as=admin` and the fixture-only `?console-role=` preview: the prototype's fictional staff, no real accounts. The sidebar at 1280 and the phone drawer open at 390, for the Owner, an Admin, Support and an Instructor (no Console rows). Then the `shell-admin` sidebar golden before (left, `da2f768`) and after (right, this PR), both captured from `design-reference/` in the pinned container. At 900px tall the new sidebar scrolls: the Access group (Roles & Permissions, Staff & Roles) is below the fold in the golden and on a 900px screen, and reached by scrolling the nav or by Tab. JPEG at 1x. These files live only in this commit; the next commit removes them.

### Owner

<img src="sidebar-owner-1280.jpg" width="560" alt="owner sidebar at 1280"> <img src="sidebar-owner-390-drawer.jpg" width="195" alt="owner phone drawer at 390">

### Admin

<img src="sidebar-admin-1280.jpg" width="560" alt="admin sidebar at 1280"> <img src="sidebar-admin-390-drawer.jpg" width="195" alt="admin phone drawer at 390">

### Support

<img src="sidebar-support-1280.jpg" width="560" alt="support sidebar at 1280"> <img src="sidebar-support-390-drawer.jpg" width="195" alt="support phone drawer at 390">

### Instructor

<img src="sidebar-instructor-1280.jpg" width="560" alt="instructor sidebar at 1280"> <img src="sidebar-instructor-390-drawer.jpg" width="195" alt="instructor phone drawer at 390">

### The `shell-admin` sidebar golden, old and new

<img src="golden-shell-admin-sidebar-old-vs-new.jpg" width="592" alt="shell-admin sidebar golden, old (left) and new (right)">
