
# Capstone Project: Adminas by Alex Symonds

## Introduction
Adminas is an in-house tool for office employees to enter purchase orders; check the order against prices and specifications; then produce one or more order confirmation PDFs (for the customer) and one or more work order PDFs (for whoever prepares the orders).

The program assumes that:
- A system administrator will add HTML/CSS for a company header/footer for document PDFs
- A system administrator will make use of Django's admin pages to enter and maintain some supporting "system data" (i.e. an address book; prices, including special resale deals; products, including details about customisable products and standard accessories)
- All users are employees of the same company and have access to all the data
- All users are trusted to enter any price for any item[^1]
- On customisable items where the customer must make a selection from various options, users are trusted to exceed the allowed quantity of selections, but are restricted to adding only "valid" items[^2]
- Expected workflow is: New > Add Items == Add PO > Check and confirm prices > Create and Issue documents. However, other than requiring some general details to be entered when creating the job, Adminas doesn't mind if users wish to do things in a different order. The purpose of a "job" is to create a bucket into which everything relating to the project can be dumped, allowing for unusual sequences of events.
- Home / to-do list and Records are intended for navigation between Jobs

[^1]: Adminas does not police pricing because low, zero or negative prices can be correct under certain circumstances, e.g. salesperson offered a special discount to win an order; warranty replacement; a line item intended to remove something.

[^2]: Exceeding the quantity is permitted -- with a warning -- because assigning "too many" of a slot filler could be reasonable if the customer also wants some extras "on the side" (e.g. spare parts, or perhaps the product is designed for users to be able to swap between different slot fillers themselves) and the user wants to assign on-the-side items to their parent for clarity. The warning is there to remind the user that these won't actually all fit inside the parent item, so perhaps it would be prudent to check the customer understands the situation.

    Entering invalid items is not permitted for two reasons: first, an invalid item is most likely some kind of mistake; second, in the unlikely event that it isn't a mistake, the system administrator should consider adding the "invalid" item to the list of valid choice options or adding a new product with a different choice list for that slot. Preventing a "normal" user from adding the invalid item is a defence against mistakes and, hopefully, a means of encouraging users to prompt the system admin to update the data when necessary.


## Distinctiveness and Complexity
### General
Adminas includes the ability to generate a PDF document (via third-party modules) from information entered into the database and it stores information about what constitutes a valid specification so that users can "build" up a complete product and check validity: none of the other projects included anything of that nature.

### Project 0, Search
The Search project was focussed around HTML and CSS, with the goal being to copy an existing site appearance and borrow its processing. Adminas is not copying the appearance of another website and it involves a fair amount of JavaScript and Python in addition to the HTML/CSS.

### Project 1, Wiki
Beyond the differences in purpose, the Wiki project was concerned with utilising markdown files to generate webpages and searching/filtering the articles. While Adminas also utilises a degree of search and filtering on the Records page, this is not the sole focus of the program.

### Project 2, Commerce
Commerce is the closest of the previous projects to Adminas, but there's still a lot separating the two. Both projects involve items on sale, but with a different focus: Commerce was managing auctions with independent users ading items for sale, while Adminas assumes it's utilised in-house by a company offering a set catalogue of products with set prices and a set discount structure, plus a stable of agents and previous customers. While both projects check a price against something and display the outcome, Adminas performs more comparisons and displays more information.

### Project 3, Mail
Adminas is not a SPA, as Mail was, nor does Adminas allow the transmission of messages between users. That said, Adminas could perhaps benefit from adding elements of Mail if it were to be expanded (e.g. sending users notifications when certain tasks are complete or allowing users to request actions by others).

### Project 4, Network
While Adminas utilises comments and pagination, as did Network, the comments on Jobs are a small feature rather than the primary focus. Adminas is not intended to be a social media site.

### Complexity
As per the project specification: Adminas utilises Django on the backend, using several models; uses Javascript on the frontend; and it's mobile responsive, allowing hypothetical office workers to process orders wherever they may be.


## How to run the application
1. Install modules as per requirements.txt
2. ```python manage.py runserver``` (or the equivalent for your OS)
3. Check if the settings in constants.py are to your liking
4. ```python manage.py makemigrations```
5. ```python manage.py migrate```
6. ```python manage.py createsuperuser``` (for access to Django admin)
7. (Optional) ```python dummy_data.py``` to populate the database with some addresses, products, prices and one job (all with a "super-villain supplies" theme)
8. Open your preferred web browser and go to http://127.0.0.1:8000/

User Configuration:
* Adjusting the company letterhead (colours/arrangement): ```doc_user.css``` is intended for the user to add their own CSS formatting. It's the only way to apply formatting to the header and footer, but it can also be used to override the CSS settings applied to the "default" documents. The user can choose to rename this file so long as they update ```CSS_FORMATTING_FILENAME``` in ```adminas/constants.py```.
* Adjusting the company letterhead (contents): replacing ```adminas/static/adminas/logo.png``` with a different PNG with the same name will change the logo. The rest of the letterhead contents are in ```adminas/templates/adminas/pdf/``` in two files named "pdf_doc_2_user_*.html" where the * is "h" for the header and "f" for the footer. The user can choose to rename these files so long as they update ```HTML_HEADER_FILENAME``` and ```HTML_FOOTER_FILENAME``` in ```adminas/constants.py```.
* constants.py allows the user to adjust which currencies, languages and INCOTERMS are acceptable to them, while also allowing them to rename the user CSS and HTML files.
* "Business data" (i.e. the sort loaded by dummy_data.py) can be added / amended via Django admin (details as per the section below)


## Additional Information: Data Handled Exclusively via Django Admin (Addresses, Products and Prices)
### Background Info: Address Models
The address book is split across three models: Company, Site and Address. The idea behind this split is: some companies have multiple different offices, factories and warehouses; sometimes those move to different locations; users are likely to be thinking in terms of "this document must go to Acme's accounting office" rather than caring much about the specific street address.

Address stores only a physical address, an FK to a Site and the date of creation. Site gives context to the Address within the Company: it allows the user to flag whether this address is a "default" address for invoices or deliveries; to add a name/label to it (e.g. accounting office, main warehouse, factory making X). Site also has a method ".current_address()" which retrieves the most recently added address, allowing old addresses to be kept on file, while ensuring the latest address appears on new documents. Company stores details about who the company is: whether they're an agent, which currency the operate in, and a shorter version of their name for display purposes.

### Background Info: Product Models
Product information is split across five models: Product, Description, StandardAccessory, SlotChoiceList and Slot. There should be one Product record for each item on the system. Descriptions are stored as separate records, allowing users to add multilingual support and to modify the descriptions over time (while storing the old descriptions for reference). 

Slot and SlotChoiceList are used to describe "modular" Products. Suppose the company sells a "joyfully toy-full chocolate egg" which contains 1-4 small toys of the customer's choice: this would be considered a modular product because the egg alone is incomplete, the customer must also order 1-4 toys (for this example, let's say 0 toys is disallowed for business reasons and 5 wouldn't fit). SlotChoiceList would store a name for the list -- "toys smaller than 6 cm", perhaps -- and an MTM list of Products for all the toy options. Slot would store a FK to the joyfully toy-full chocolate egg Product; a FK to the "toys smaller than 6 cm" SlotChoiceList; its own name for display on the module management page ("Toy", perhaps); that 1 is required and an additional 3 are optional. A single SlotChoiceList can be used to populate multiple different Slots in multiple different Products. Multiple Slots can be assigned to a single Product in the event of a more complex modular item.

StandardAccessory is used in cases where one Product is supplied with a selection of other products as standard. It can be used to add small sundry items to a Product (e.g. a dust cover, a power cable, batteries); to create "package deals" (i.e. create a Product for the package, then add all the included Products via StandardAccessories); or to create modular items with pre-selected valid options (e.g. there could be an "awfully dinosaur-full chocolate egg" Product where instead of having Slots and a SlotChoiceList, the system admin adds four dinosaur toy Products as StandardAccessories).

### Background Info: Price Models
Pricing information is split across four models, Price, PriceList, ResaleCategory and AgentResaleGroup.

PriceList sets the "valid from" date for a set of prices and assigns a name to the price list for reference purposes (e.g. "2022 Q1"). Price stores a currency, a value, and FKs to the Product and the PriceList. Together these set the "normal" prices.

Suppose the company sells directly to customers, but also via resellers/agents. Chances are there'll be some sort of resale discount on offer, but not necessarily the same resale discount on all Products and also not necessarily the same resale discount to all agents.

ResaleCategory is used for "default" resale discounts, based solely on the Product: it has fields for a category name and the percentage. Adminas assumes that each Product will only have one default resale discount, because if a Product is in two categories where one has 10% resale and one has 20% resale, all agents will insist on applying the 20% category every time, so the 10% category would only serve to waste time in fruitless discussions. Since this makes it a OTM field, the Product model contains a "resale_category" FK to the ResaleCategory.

AgentResaleGroup is used for agent-and-product-specific resale discounts. It has fields for a name, a percentage, and an FK to the agent's Company record. One Product could appear in multiple AgentResaleGroups (maybe the company sells dynamite at 20% standard resale, but Quality Mining Supplies gets 30% for being bulk-buyers, while Acme were only offered 5% because their customers keep misusing the dynamite to target roadrunners, bringing shame and legal challenges to the company), so it's an MTM link. For consistency with ResaleCategory, this is also contained inside the Product model as "special_resale".

### Django Admin: Addresses, Products and Prices
Companys includes Sites and AgentResaleGroups in tabular format. The inclusion of Sites means users can see a list of all Sites for this Company in one place and, importantly, which are flagged as default invoice/delivery addresses, making it easier to manage those flags. AgentResaleGroups provides a convenient list of any/all special deals offered to this agent (when applicable), making it easier to see all special deals currently offered to the agent and adjust the percentages on offer when something new has been negotiated. 

Sites can also be accessed separately, where Addresses are included in tabular format. When updating an address, odds are that the system administrator will be thinking in terms for "Acme's accounting office has moved" rather than street addresses, so this is intended to make it easier to find the correct address. It also serves to show an address history for each Site, should that be of interest.

AgentResaleGroups can also be accessed separately, where it displays a list of Products included in the group in tabular format. This allows modifications to the list of Products included in each AgentResaleGroup (and the percentages, if the user is so inclined).

Products has Descriptions, StandardAccessories and Slots displayed tabularly. Descriptions are a key piece of Product information and it makes sense to access them via the Product, since users are likely to think it terms of "I need to adjust the EN description of ProductX". The presence of StandardAccessories and Slots means users can see a full list of all Products supplied with this Product and the details of any "empty slots" for adding more Products, all in one space. As with Descriptions, users are likely to think of StandardAccessories and Slots in terms of the Product to which they belong. All three can only be accessed via Products.

SlotChoiceLists simply allows users to modify the names and which Products are valid options for each choice list. 

PriceList has associated Prices displayed tabularly: PriceList is almost just a label for a set of Prices and users will want to see these all in one place.

ResaleCategorys is where users can see a list of all the standard categories and modify their names and percentages. Each record shows a read-only list of Products assigned to that category. If the user wishes to modify which Products appear in a category, it's necessary to do this via Products.

## Additional Information: Other Data
### Job Models
Job is the main port of call for a since project/order/job. Everything about the Job has a field with an FK referring back to it.

A PurchaseOrder reflects one purchase order document, as received from a customer. Usually the receipt of a purchase order is what will initiate the creation of a Job, so I considered having "Order" instead of "Job" and including PO fields in it, but this approach would go horribly wrong under certain rare-but-not-rare-enough circumstances: when a colleague wants something prepared for an exhibition or demonstration, so there's no purchase order but work is required; when a customer only wants the goods if they can have them in 4 weeks, the goods have a leadtime of 4 weeks, but the customer's internal processes mean they can't issue a PO until 3 weeks from now; if a customer modifies their order via issuing additional POs instead of revising the original one. As such, it's better to have a bucket that represents nothing beyond "one project in Adminas" -- i.e. Job -- and have a separate model for PurchaseOrders.

JobComments enable users to add notes to Jobs, both private (to add reminders that mean something to them, but not anyone else) and public (information about the Job that everyone should know), and so they can decide how and where the comments should be displayed (on the to-do list and in a special panel via "pinned"; just in a special panel and with emphasised formatted via "highlighted").

JobItems are the means by which Products are added to Jobs, with the ability to also state the price, the applicable price list (sometimes customers are permitted to mix-and-match), and how many are required.


## Modular JobItems Model
This is handled by one model, JobModule. Via FKs it links the parent JobItem to the child JobItem and the Slot the child is supposed to be filling, plus a quantity.


### Document Models
There are nine models related to documents: DocumentData, DocumentVersion, DocAssignment, ProductionData, SpecialInstruction, DocumentStaticMainFields, DocumentStaticOptionalFields, DocumentStaticSpecialInstruction, and DocumentStaticLineItem.

DocumentData represents "one document", storing all information about the document which will remain constant across any/all revisions that might be needed. This turns out to be limited to the type of document, the FK to the associated Job, and a reference name.

DocumentVersion represents "one version of one document", it stores information about a document which could change across revisions. The remaining models related to documents have a field for the FK of the associated DocumentVersion (rather than the DocumentData) because they all contains things which can vary across versions.

DocAssignment is a through MTM model, used to link a JobItem to a DocumentVersion, but with a quantity (necessary because JobItem has a quantity field and users won't necessarily want all of them to appear on the same document).

SpecialInstruction allows users to communicate unusual details with the folks preparing the order (on the works order) and the customer (on the order confirmation). Some orders will have none, while others could have dozens, hence this being a separate model.

Not all documents need production dates, so to avoid vast amounts of "null" in DocumentVersion, it's stored as "ProductionData".

The four ```DocumentStatic*``` models are used to store the final state of a document when it's issued, so that Adminas has the information it needs to reconstruct the PDF of the issued document as it was when it was issued, without risk of any subsequent updates being incorrectly retroactively applied. 


## Additional Information: Design Decisions
- Users must select addresses from an address book and are not given the ability to create or update addresses via the New or Job pages. This is because when a user's mind is on the task of processing an order, their mind isn't on maintaining a pristine address book. Adminas keeps those two tasks completely separate in the hope of avoiding the same Site appearing half a dozen times under slightly different names because people kept forgetting what they'd called it and couldn't be bothered to delay their order processing to find it.
- Users must use the Product Descriptions provided by the system, with no way to edit this; Adminas also assumes that every JobItem on a Job must appear once on each type of document, with no alternative means of display (e.g. grouping items and displaying a group name with a subtotal instead of displaying each item individually). This is because the only documents currently created by Adminas are works orders and order confirmations. Work orders are read by employees preparing orders, who will work more efficiently if they can just glance at it and recognise the standard descriptions arranged in a familiar manner. If the reason for changing the description was to make an actual modification to the product supplied (rather than purely semantic) then it's a bad idea to try to express it in that manner: the workers won't notice the difference during their quick glance, so they'll supply the unmodified item (hence "SpecialInstructions" in a big obvious box at the top instead). Meanwhile, the most likely reason for changing the wording on an order confirmation is make it match the customer's purchase order. Since one of the purposes of an order confirmation is to translate the buyer's purchase order into terms the seller understands -- so the buyer can check the order confirmation correctly reflects their understanding -- rewording it to match the purchase order loses that functionality. Buyers rarely insist on this anyway, usually it's invoices and shipping documents where wording becomes an issue. 
- Regarding the ```DocumentStatic*``` models, I considered two other means of preserving the issued state of a document: to store the actual PDFs in Adminas (so clicking the button a second time shows the previously created PDF instead of making a new one from data) and to prevent users and super users from updating/deleting anything that's appeared on an issued document. I decided against the PDFs since it seems that would require a lot more memory than storing the strings (though less database access, so an argument could be made in the other direction! Then again, you're only accessing the database when someone wants to look at an old PDF, but the PDF storage would use up memory even if nobody ever looks at it again). I decided against locking records for editing because it'd be a big pain for someone to try to adjust a typo and keep getting "denied" and needing to make a new Address and link it to the Site and so on.


## Additional Information: Ideas for Extension
- Refactor Adminas to work as a website used by multiple different companies, instead of as an in-house tool. Perhaps by adding an "CompanyAccount" model for each company on Adminas, then giving every User an FK to the CompanyAccount, allowing data to be filtered accordingly; company-specific constants and the HTML/CSS for the PDFs would also need to be handled differently.
- Have different types of users with different levels of access (e.g. maybe some employees aren't trusted with non-standard prices and are limited to selecting list or previously agreed resale)
- Add Adminas modules for managing addresses, products and prices, so nobody needs to use Django admin
- Order entry data and reports/graphs. Adminas could take information added for PurchaseOrders (on creation, update and deletion), modify this as needed for storing OE figures, then output this as a CSV and/or use it to produce reports and graphs.
- Quotation tool. Salespeople would also benefit from module management to guide them through the options and requirements of modular items. Also, creating a quote would require adding the list of items, entering customer details and setting prices for everything, so in the event of the quote leading to an order, the quote inputs could be used as a basis for generating the Job, saving admin users from pointless duplication of work and pre-confirming any unusual prices.
- CMS for salespeople, so they can better manage their quotes.
- Production module. It would be convenient for admin users if Adminas could automatically notify production users of new orders and requested dates, then notify the admin users when production users respond with a scheduled date. Unfortunately it wouldn't be so convenient for production users if they have to keep logging into Adminas solely to see if any new orders have come in, so it'd be better if Adminas also provides them with their own reasons to log in: perhaps a calendar/kanban board so they can block in labour for each order, a stock control system, a production to-do list, etc.
- Expansion to other types of PDFs. Adminas could also handle invoices, packing lists, receipts, shipping documents, case marks, certificates of whatever (warranty certs, beneficiary's certs, bills of exchange, etc. etc.). Though in the case of invoices, this would involve a lot more flexibility over the contents and a lot of rules on when they can be created, edited and deleted (customers and accountants can get very picky about these details).
- In the event of more documents being involved, it might also be nice to have a visual progress indicator on each Job on the to-do list and Records, so users can see at a glance that this Job needs an invoice and that Job is waiting for shipping arrangements.
- Give users a selection of different PDF templates for documents, with stylised icons to switch between them (and, if CompanyAccounts exist, a means to apply these to all users on the the same CompanyAccount)
- Give users a code-less means of adjusting the company-specific HTML/CSS of the PDFs


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
#### "Standard" Django files
* admin.py has the settings for Django's admin page
* forms.py has the settings for any/all forms
* models.py contains the models, including many methods
* urls.py sets up the URLs and how they correspond to the fucntions in views.py
* views.py contains the logic for handling GET/POST requests
 
#### constants.py 
Contains "business-y" constants: CSS settings for their document stationery, currencies they accept, languages they support, INCOTERMS they allow, etc.

#### util.py
* formatting functions: format_money(), get_plus_prefix(), debug()
* reusable error pages: anonymous_user(), error_page()
* a couple of functions for creating new database objects: add_jobitem() and copy_relations_to_new_document_version()
* get_document_available_items(), which is used by the document_builder page to create a dict of JobItems available for use on a document of a given type


### Subfolder adminas/templatetags/ 
The three files with names beginning with "get" allow Django templates to make use of some class methods which require an object as an argument.

query_transform.py is used by the pagination navigation. The records page uses GET parameters for both pagination and filter settings, so using ```"?page={{ page.next_page_number }}"``` in the pagination navigation (as suggested in the Django docs) would result in it losing all the filter settings, making it impossible to ever see past the first page of filtered records. query_transform.py solves this problem by copying the entire current URL and updating only the GET parameter passed in as an argument.


### Subfolder adminas/templates/adminas/
layout.html is the base for all webpages. Then there's one html file for each page on Adminas.

#### Subfolder components/
* comment_base.html, comment_collapse.html and comment_full.html contain the HTML for a single comment. comment_base.html has the parts common to all comments; comment_collapse.html and comment_full.html extend it in different ways to create the "slimline" version (where you click to expand the section with the buttons) and the full version (where you don't).
* pagination_nav.html is the pagination navigation strip, used on the job_comments and records pages.

#### Subfolder pdf/
Contains the HTML files used for generating PDFs. wkhtmltopdf paginates the main/body HTML file; it also allows users to pass in two other HTML files to serve as a static header and footer across every page of the PDF. For Adminas PDFs, the header and footer will each require two parts: a "company" header/footer (with logos, addresses, contact details etc.) and a "document" header/footer (with any document-specific content that should be repeated on each page, rather than paginated, e.g. reference numbers).

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
Enables editing existing JobItems, both via the edit button on the panels for each item or via the pricecheck table.

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
