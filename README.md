
## Distinctiveness and Complexity
While Adminas has comments, as does Project 4, the comments on Jobs are a small feature rather than being the primary focus: Adminas is an adminitrative tool, not a social media site.

While Adminas involves products for sale, as does Project 2, Adminas is designed to be an in-house tool used solely by employees to process orders coming in via purchase orders.

It utilises Django on the backend with several models, uses Javascript on the frontend on many pages, and it's mobile responsive, allowing hypoethetical administrators to process orders wherever they might be.




## What's in each file I created

### Python
TODO

### Templates (adminas/templates/adminas/)
#### components/ folder
Contains the equivalent of a "layout.html" but for a single comment (comment_base.html) then two extensions to turn that into the "streamlined" and "full" versions.
Also contains the pagination controls, so I could use the same HTML at the top and bottom of the comments page and on the Records page.

#### pdf/ folder
Contains the HTML files necessary for generating the PDF documents. The PDF plugin I chose paginates anything passed in as the main/body HTML file; it also allows users to pass in two other HTML files to serve as a static header and footer across every page of the resulting PDF.

pdf_doc_0_layout.html contains HTML common to all three of the "final" HTML files used by the plugin: that is, the body, the header and the footer.
pdf_doc_2_user_{ h || f }.html files contain company letterheads (aka headers/footers).
pdf_doc_2_{ doc_type }_{ h || b || f}.html files contain the document-type-specific HTML, split into header, footer and body to play nicely with the PDF plugin.
pdf_doc_1_{ body || footer || header }.html has any HTML needed by all headers (or footers, or bodies) and brings in the document-type specific HTML and, where applicable, the user/company-specific HTML.

#### others
The other HTML files correspond to the appropriate page.


### CSS
TODO

### Javascript (adminas/static/adminas/...)
#### auto_address.js
On changing a dropdown of address names, request the full address from the server and display it on the page.

#### auto_item_desc.js
On changing a dropdown containing product names, request the product description of the item and display it on the page.

#### document_builder_main.js
1) Save, issue and delete buttons at the top of the document_builder page, plus the "unsaved changes" warning box.
2) Special Instructions: hide/show of the "create new" form, plus "edit mode" and updating the page without a reload afterwards.

#### document_items.js
Adds functionality to the "split" and "incl/excl" buttons on the Document Builder page's item lists.

#### document_main.js
Adds functionality to the two "version" buttons, replace and revert. (Note: "replace" only available on issued documents; revert only available on issued documents with >1 version)

#### items_edit.js
Enables editing existing JobItems from the Job page. Edit is sometimes followed by a reload (if module assignments were affected), but sometimes by an update-without-reload (if only prices and/or non-module-related items were affected). 

#### items_new_form.js
On the Job page, allows the user to hide/unhide the entire "add new JobItems" form and modify the form to create multiple JobItems in one go.

#### job_comments.js
Comment functionality: create, edit, delete and toggling statuses. Used on three pages (home, job_comments and job).

#### job_price_check_btn.js
Functionality for the "selling price is {NOT }CONFIRMED" indicator/button on the Job page. Toggles the price_confirmed status on the server and updates the page.

#### job_toggle.js
Job page visibility toggles for the "add PO" form and the "add JobItems" form.

#### manage_modules.js
Module Management support. Allows users to edit an existing slot filler; add space for an additional slot filler (via the "+ slot" button); fill an empty slot with an existing JobItem or by creating a new JobItem.

#### po_edit.js
Job page's PO section. Enables editing and deleting of an existing PO. (New POs are handled via a form.)

#### records_filter.js
Enables the filter on the Records page: opens the "form", turns the inputs into appropriate GET parameters, then reloads the page with the parameters.

#### records_list_toggle.js
Handles the "view" buttons on the Records page. (If there are multiple POs or items on an order, users can view them in a pop-up by clicking "view").

#### todo_management.js
Allows users to adjust which Jobs appear on the to-do list in three ways: add via the "plus" buttons on the Records page; remove via the "minus" circles on the homepage to-do list; toggle via the "indicator" on the Job page.

#### util.js
A selection of general-purpose functions available to all pages. Includes: formatting numbers with thousand separator commas; obtaining the date; obtaining a select index based on the display text; finding the last element of a type on the page; a couple of functions from the Django documentation regarding CSRF authentication; functions to hide/show elements based on CSS class; wipe data from a "form row"; several generic DOM elements (message boxes, buttons, panels).





