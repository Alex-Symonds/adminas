
# Capstone Project: Adminas by Alex Symonds

## Purpose
Adminas is a tool for office employees to enter purchase orders, check the prices and specifications, then produce one or more order confirmation PDFs (for the customer) and one or more work order PDFs (for whoever prepares the orders).


## Distinctiveness and Complexity
While Adminas utilises comments, as does Project 4, the comments on Jobs are a small feature rather than the primary focus: Adminas is not a social media site.

While Adminas involves products on sale, as does Project 2, Adminas is designed to be used as an in-house tool by employees to process and check incoming orders, not as an e-commerce site.

Adminas utilises Django on the backend, using several models; uses Javascript on the frontend; and it's mobile responsive, allowing hypothetical office workers to process orders wherever they may be.


## How to run the application
1. Install modules as per requirements.txt
2. ```python manage.py runserver``` (or the equivalent for your OS)
3. Check if the settings in constants.py are to your liking
4. ```python manage.py makemigrations```
5. ```python manage.py migrate```
6. Open your preferred web browser and go to http://127.0.0.1:8000/

Optional, but recommended (populate the database with dummy data for customers, agents, prices and products):
1. ```python manage.py createsuperuser``` for access to Django admin
2. ```python dummy_data.py``` to populate the database (with a "super-villain supplies" theme).


User Configuration:
* Adjusting the company letterhead (colours/arrangement): ```doc_user.css``` is intended for the user to add their own CSS formatting. It's the only way to apply formatting to the header and footer, but it can also be used to override the CSS settings applied to the "default" documents. The user can choose to rename this file so long as they update ```CSS_FORMATTING_FILENAME``` in ```adminas/constants.py```.
* Adjusting the company letterhead (contents): replacing ```adminas/static/adminas/logo.png``` with a different PNG with the same name will change the logo. The rest of the letterhead contents are in ```adminas/templates/adminas/pdf/``` in two files named "pdf_doc_2_user_*.html" where the * is "h" for the header and "f" for the footer. The user can choose to rename these files so long as they update ```HTML_HEADER_FILENAME``` and ```HTML_FOOTER_FILENAME``` in ```adminas/constants.py```.
* constants.py allows the user to adjust which currencies, languages and INCOTERMS are acceptable to them, while also allowing them to rename the user CSS and HTML files.




## What's in each file I created
### Main Folder
#### dummy_data.py
Run from the command line ```python dummy_data.py``` to populate the database with some dummy data (with a "super-villain supplies" theme) for everything which an office worker tasked with entering a purchase order would expect to be "on the system" already. That is:
* Companies, both customers and agents (including addresses, sites, and special resale discount agreements)
* Products (including descriptions, standard accessories and setting up modular items with slots)
* Price lists (including standard resale discounts)

#### populate_pricelist.py
Adding a new empty price list via Django admin is easy enough, but populating it would be a painful process of manually adding a new Price record for each combination of active_product and supported currency. populate_pricelist.py is intended to help with the population step: it creates a set of Price records for every active_product/currency combination and assigns them to the most recent PriceList (assuming it's empty). This means the admin user only needs to create the empty price list, run the script, then enter the new prices. Alternatively, if the new prices are a straightforward "X% increase on whatever it was last time", the user can enter "X" as an optional argument and the program will apply that increase to the previous price for the same product&currency pair, if possible.

### Subfolder adminas/
#### constants.py 
Contains "business-y" constants: CSS settings for their document stationery, currencies they accept, languages they support, INCOTERMS they allow, etc.

#### util.py
* formatting functions: format_money(), get_plus_prefix(), debug()
* reusable error pages: anonymous_user(), error_page()
* a couple of functions for creating new database objects: add_jobitem() and copy_relations_to_new_document_version()
* get_document_available_items(), which is used by the document_builder page to create a dict of JobItems available for use on a document of a given type


### Subfolder adminas/templatetags/ 
The three files beginning with "get" allow Django templates to make use of some class methods which require an object as an argument.

query_transform.py is used by the pagination navigation. The records page uses GET parameters for both pagination and filter settings, so using ```"?page={{ page.next_page_number }}"``` in the pagination navigation (as suggested in the Django docs) would result in it losing all the filter settings, making it impossible to ever see past the first page of filtered records. query_transform.py solves this problem by copying the entire current URL and updating only the GET parameter passed in as an argument.


### Subfolder adminas/templates/adminas/
#### Subfolder components/
* comment_base.html, comment_collapse.html and comment_full.html contain the HTML for a single comment. comment_base.html has the parts common to all comments; comment_collapse.html and comment_full.html extend it in different ways to create the "slimline" version (where you click to expand the section with the buttons) and the full version (where you don't).
* pagination_nav.html is the pagination navigation strip, used on the job_comments and records pages.

#### Subfolder pdf/
Contains the HTML files used for generating PDFs. wkhtmltopdf paginates the main/body HTML file; it also allows users to pass in two other HTML files to serve as a static header and footer across every page of the PDF. For Adminas PDFs, the header and footer will each require two parts: a "company" header/footer (with logos, addresses, contact details etc.) and a "document" header/footer (with any document-specific content that should be repeated on each page).

* pdf_doc_0_layout.html contains HTML common to all three of the "final" HTML files used by wkhtmltopdf (that is, the body, the header and the footer).
* pdf_doc_1_*.html extends the layout for each of the three "final" HTML files. It brings together the company and document components (plus anything else needed by all headers, all footers or all bodies).
* pdf_doc_2_user_*.html files contain the company header/footer (aka their letterhead).
* pdf_doc_2_{ doc_type }_*.html files are for the actual document contents ( title, fields, line items, etc.).



### Subfolder adminas/static/adminas/
#### Images
* Everything named "i_*.svg" is an icon.
* logo.png is the company logo used in the PDF company header.

#### CSS
##### styles.css
Used by: all webpages.
"Main" CSS file containing all CSS except for that used on/by the PDFs.

##### doc_preview.css
Used by: PDFs
Formatting to clearly distinguish a "preview" (aka draft) copy of a document from the final, issued version.

##### doc_default_oc.css, doc_default_wo.css
Used by: PDFs.
Formatting for the main contents of each PDF.
Note: wkhtmltopdf doesn't support some CSS features (e.g. flexbox and grid).

##### doc_user.css
Used by: PDFs.
Formatting for user-specific page content, i.e. the company header and footer. In principle, a user could also use this to override the colours on the documents in order to better reflect their corporate branding (though I haven't utilised this in the example).
Note: wkhtmltopdf doesn't support some CSS features (e.g. flexbox and grid).



#### Javascript
##### auto_address.js
Used by: edit.
On changing a dropdown of address names, request the full address from the server and display it on the page.

##### auto_item_desc.js
Used by: job, edit.
On changing a dropdown containing product names, request the product description of the item and display it on the page.

##### document_builder_main.js
Used by: document_builder.
1. Save, issue and delete buttons at the top of the page, plus the "unsaved changes" warning box.
2. Special Instructions: hide/show of the "create new" form, plus "edit mode" and updating the page without a reload afterwards.

##### document_items.js
Used by: document_builder.
Adds functionality to the "split" and "incl/excl" buttons on the item lists.

##### document_main.js
Used by: document_main.
Adds functionality to the two "version" buttons, replace and revert. (Note: "replace" only available on issued documents; revert only available on issued documents with >1 version)

##### items_edit.js
Used by: job.
Enables editing existing JobItems. Edit is sometimes followed by a reload (if module assignments were affected), but sometimes by an update-without-reload (if only prices and/or non-module-related items were affected). 

##### items_new_form.js
Used by: job.
Allows the user to hide/unhide the entire "add new JobItems" form and modify the form to create multiple JobItems in one go.

##### job_comments.js
Used by: job, job_comments, index.
Comment functionality: create, edit, delete and toggling statuses.

##### job_delete.js
Used by: edit.
Enables the "delete" button when editing an existing Job.

##### job_price_check_btn.js
Used by: job.
Functionality for the "selling price is {NOT }CONFIRMED" indicator/button on the Job page. Toggles the price_confirmed status on the server and updates the page.

##### job_toggle.js
Used by: job.
Job page visibility toggles for the "add PO" form and the "add JobItems" form.

##### manage_modules.js
Used by: module_management.
Allows users to edit an existing slot filler; add space for an additional slot filler (via the "+ slot" button); fill an empty slot with an existing JobItem or by creating a new JobItem.

##### po_edit.js
Used by: job.
Job page's PO section. Enables updating and deleting of an existing PO. (Creating a new PO is handled via a form.)

##### records_filter.js
Used by: records.
Enables the filter: opens the "form-like", turns the inputs into appropriate GET parameters, then reloads the page with the parameters.

##### records_list_toggle.js
Used by: records.
Handles the "view" buttons. (If there are multiple POs or items on an order, users can view them in a pop-up by clicking "view").

##### todo_management.js
Used by: job, home, records.
Allows users to adjust which Jobs appear on the to-do list in three ways: add via the "plus" buttons on the Records page; remove via the "minus" circles on the homepage to-do list; toggle via the "indicator" on the Job page.

##### util.js
Used by: any/all pages.
A selection of general-purpose functions available to all pages. Includes: formatting numbers with thousand separator commas; obtaining the date; obtaining a select index based on the display text; finding the last element of a type on the page; a couple of functions from the Django documentation regarding CSRF authentication; functions to hide/show elements based on CSS class; wipe data from a "form row"; several generic DOM elements (message boxes, buttons, panels).
