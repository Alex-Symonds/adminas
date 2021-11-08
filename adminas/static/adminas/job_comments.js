const ID_ADD_COMMENT_WITH_SETTINGS_BTN = 'id_add_job_comment_with_settings';
const CLASS_ADD_COMMENT_SIMPLIFIED = 'add-job-comment-simplified';
const DEFAULT_COMMENT_ID = '0';
const CLASS_COMMENT_EDIT_BTN = 'edit-comment';
const CLASS_COMMENT_DELETE_BTN = 'delete-comment-btn';
const CLASS_COMMENT_PINNED_TOGGLE = 'pinned-toggle';
const CLASS_COMMENT_HIGHLIGHTED_TOGGLE = 'highlighted-toggle';

const CLASS_COMMENT_CU_ELEMENT = 'job-comment-cu-container';
const ID_COMMENT_TEXTAREA = 'id_comment_contents';
const ID_COMMENT_CHECKBOX_PRIVATE = 'id_private_checkbox';
const ID_COMMENT_CHECKBOX_PINNED = 'id_pinned_checkbox';
const ID_COMMENT_CHECKBOX_HIGHLIGHTED = 'id_highlighted_checkbox';

const CLASS_INDIVIDUAL_COMMENT_ELE = 'one-comment';
const CLASS_COMMENT_MAIN = 'main';
const CLASS_COMMENT_CONTENTS = 'contents';
const CLASS_COMMENT_CONTROLS = 'controls';
const CLASS_COMMENT_FOOTER = 'footer';
const CLASS_COMMENT_OWNERSHIP = 'ownership';

const CLASS_PINNED_BTN_ON = 'pinned-status-on';
const CLASS_PINNED_BTN_OFF = 'pinned-status-off';
const CLASS_PRIVACY_STATUS = 'privacy-status';

const CLASS_ACCESS_DENIED = 'access-denied';

const CLASS_COMMENT_SECTION = 'comments';
const CLASS_COMMENTS_CONTAINER = 'comment-container';
const CLASS_ALL_COMMENTS_CONTAINER = 'all-comments';
const CLASS_PINNED_COMMENTS_CONTAINER = 'pinned';
const CLASS_HIGHLIGHTED_COMMENTS_CONTAINER = 'highlighted';
const CLASS_PREFIX_FOR_COMMENT_ID = 'id-';

const SECTION_NAMES = ['all-comments', 'pinned', 'highlighted'];

const CLASS_HIGHLIGHTED_CSS = 'highlighted';
const CLASS_EMPTY_SECTION_P = 'empty-section-notice';

const ATTR_LABEL_FORM_TYPE = 'data-form_type'
const VALUE_FORM_TYPE_FULL = 'full';
const VALUE_FORM_TYPE_CONTENT_ONLY = 'content-only';
const CLASS_HOVER_PARENT = 'hover-parent';

const CLASS_BTN_PRIMARY = 'button-primary';
const CLASS_BTN_WARNING = 'button-warning';

// Assign event listeners onload
document.addEventListener('DOMContentLoaded', () => {

    let add_comment_button = document.getElementById(ID_ADD_COMMENT_WITH_SETTINGS_BTN);
    if(add_comment_button != null){
        add_comment_button.addEventListener('click', (e)=>{
            open_jobcomment_editor_for_create(e.target);
        });
    }

    document.querySelectorAll('.' + CLASS_ADD_COMMENT_SIMPLIFIED).forEach(btn => {
        btn.addEventListener('click', (e) => {
            open_jobcomment_editor_for_create(e.target);
        })
    });

    document.querySelectorAll('.' + CLASS_COMMENT_EDIT_BTN).forEach(btn => {
        btn.addEventListener('click', (e) => {
            open_jobcomment_editor_for_update(e.target);
        })
    });

    document.querySelectorAll('.' + CLASS_COMMENT_PINNED_TOGGLE).forEach(btn => {
        btn.addEventListener('click', (e) => {
            toggle_status(e.target, 'pinned');
        });
    });

    document.querySelectorAll('.' + CLASS_COMMENT_HIGHLIGHTED_TOGGLE).forEach(btn => {
        btn.addEventListener('click', (e) => {
            toggle_status(e.target, 'highlighted');
        });
    });

});










// --------------------------------------------------------------------------------------------
// Frontend Start: Open Create/Update Mode
// --------------------------------------------------------------------------------------------
// Open Create Mode: called onclick on an "add new comment" button
function open_jobcomment_editor_for_create(btn){
    // There's only supposed to be one instance of the element in existence at a time (it uses IDs, don't want those duplicated),
    // so if the user has somehow managed to open one copy and ask for a second, close the old before opening the new.
    close_jobcomment_editor();

    if(btn.dataset.form_type === VALUE_FORM_TYPE_CONTENT_ONLY){
        var job_comment_form = create_ele_jobcomment_editor(DEFAULT_COMMENT_ID, false);
    }
    else{
        var job_comment_form = create_ele_jobcomment_editor(DEFAULT_COMMENT_ID, true);
    }
    btn.after(job_comment_form);

    // Hide the buttons that call this function in the (vain?) hope of preventing the user from somehow opening multiple copies of the element.
    visibility_add_comment_btn(false);
    hide_all_by_class(CLASS_COMMENT_EDIT_BTN);    
}


// Open Create Mode (also used for Update): function to create input elements for creating a Job comment.
// This simplified version only allows editing/creation of the content of the comment. All other settings
// are chosen by the server.
function create_ele_jobcomment_editor(comment_id, want_settings){
    let container = create_ele_jobcomment_main_container();
    container.append(create_ele_jobcomment_heading(comment_id));
    container.append(create_ele_jobcomment_input_contents());
    
    if(want_settings){
        container.append(create_ele_jobcomment_checkbox_container());
        container.append(create_ele_jobcomment_controls_container(comment_id, VALUE_FORM_TYPE_FULL));        
    }
    else {
        container.append(create_ele_jobcomment_controls_container(comment_id, VALUE_FORM_TYPE_CONTENT_ONLY));        
    }
    return container;
}

function create_ele_jobcomment_checkbox_container(){
    let container = document.createElement('div');
    
    // Inputs unqiue to this "with settings" version
    let private_label = document.createElement('label');
    private_label.innerHTML = 'Private';
    private_label.for = ID_COMMENT_CHECKBOX_PRIVATE;
    container.append(private_label);

    let private_checkbox = document.createElement('input');
    private_checkbox.type = 'checkbox';
    private_checkbox.id = ID_COMMENT_CHECKBOX_PRIVATE;
    private_checkbox.checked = true;
    container.append(private_checkbox);

    let pinned_label = document.createElement('label');
    pinned_label.innerHTML = 'Pin';
    pinned_label.for = ID_COMMENT_CHECKBOX_PINNED;
    container.append(pinned_label);

    let pinned_checkbox = document.createElement('input');
    pinned_checkbox.type = 'checkbox';
    pinned_checkbox.id = ID_COMMENT_CHECKBOX_PINNED;
    container.append(pinned_checkbox);

    let highlighted_label = document.createElement('label');
    highlighted_label.innerHTML = 'Highlight';
    highlighted_label.for = ID_COMMENT_CHECKBOX_HIGHLIGHTED;
    container.append(highlighted_label);

    let highlighted_checkbox = document.createElement('input');
    highlighted_checkbox.type = 'checkbox';
    highlighted_checkbox.id = ID_COMMENT_CHECKBOX_HIGHLIGHTED;
    container.append(highlighted_checkbox);

    return container;
}



// Create Job Comment Inputs
function create_ele_jobcomment_main_container(){
    let container = document.createElement('div');
    container.classList.add(CLASS_COMMENT_CU_ELEMENT);
    return container;
}
function create_ele_jobcomment_heading(comment_id){
    let h = document.createElement('h4');
    if(comment_id == DEFAULT_COMMENT_ID){
        h.innerHTML = 'Add Comment';
    } else {
        h.innerHTML = 'Editing';
    }
    return h; 
}
function create_ele_jobcomment_input_contents(){
    let main_input = document.createElement('textarea');
    main_input.name = 'contents';
    main_input.id = ID_COMMENT_TEXTAREA;
    main_input.cols = 30;
    main_input.rows = 5;
    return main_input;
}
function create_ele_jobcomment_controls_container(comment_id, form_type){
    let container = document.createElement('div');
    container.classList.add(CLASS_COMMENT_CONTROLS);

    container.append(create_ele_jobcomment_btn_save(comment_id, form_type));
    container.append(create_ele_jobcomment_btn_close());

    // Delete button is only relevant when editing an existing comment, so check before trying to append null.
    let delete_btn = create_ele_jobcomment_btn_delete(comment_id);
    if(delete_btn != null){
        container.append(delete_btn);
    }

    return container;
}
function create_ele_jobcomment_btn_save(comment_id, form_type){
    let save_btn = document.createElement('button');
    save_btn.classList.add(CLASS_BTN_PRIMARY);
    save_btn.innerHTML = 'save';
    save_btn.setAttribute('data-comment_id', comment_id);
    save_btn.setAttribute('data-form_type', form_type);
    save_btn.addEventListener('click', (e) => {
        save_job_comment(e.target);
    });
    return save_btn;
}
function create_ele_jobcomment_btn_close(){
    let close_btn = document.createElement('button');
    close_btn.classList.add(CLASS_BTN_PRIMARY);
    close_btn.innerHTML = 'cancel';
    close_btn.addEventListener('click', () => {
        close_jobcomment_editor();
    });
    return close_btn;
}
function create_ele_jobcomment_btn_delete(comment_id){
    // Create and Update forms are the same except there's no need for a delete button on the create form.
    // Check if we're making an edit form (via the comment_id) then return a button or null.
    if(comment_id != DEFAULT_COMMENT_ID){
        let delete_btn = document.createElement('button');
        delete_btn.classList.add(CLASS_COMMENT_DELETE_BTN);
        delete_btn.classList.add(CLASS_BTN_WARNING);
        delete_btn.innerHTML = 'delete';
        delete_btn.addEventListener('click', (e) => {
            delete_job_comment(e.target);
        });
        return delete_btn;
    }
    return null;
}






// Cancel Create/Update Mode: called onclick of the "cancel" button located in the JobComment "form"
function close_jobcomment_editor(){
    let ele = document.querySelector('.' + CLASS_COMMENT_CU_ELEMENT);
    if(ele == null){
        // It's not open, so there's nothing to close
        return;
    }

    // If the calling button is located inside a comment element, we will have hidden the comment "content" during editing:
    // unhide that now.
    let comment_ele = ele.closest('.' + CLASS_INDIVIDUAL_COMMENT_ELE);
    ele.remove();
    if(comment_ele != null){
        visibility_comment_content(comment_ele, true);
    }

    // Restore visibility to the "open create ele" and edit buttons
    visibility_add_comment_btn(true);
    unhide_all_by_class(CLASS_COMMENT_EDIT_BTN);
    return;
}



// Open Edit Mode: called onclick of an edit button
function open_jobcomment_editor_for_update(btn){
    let comment_ele = btn.closest('.' + CLASS_INDIVIDUAL_COMMENT_ELE);
    let section_ele = comment_ele.closest('.' + CLASS_COMMENTS_CONTAINER);

    // If this comment is in the "pinned" section, we don't want settings; otherwise we do.
    let want_settings = !(section_ele != null && section_ele.classList.contains(CLASS_PINNED_COMMENTS_CONTAINER));

    let edit_mode_ele = create_ele_jobcomment_editor(comment_ele.dataset.comment_id, want_settings);
    edit_mode_ele = populate_ele_jobcomment_editor_with_existing(edit_mode_ele, comment_ele, want_settings);

    comment_ele.prepend(edit_mode_ele);
    visibility_comment_content(comment_ele, false);
}

function populate_ele_jobcomment_editor_with_existing(editor_ele, comment_ele, want_settings){
    // Populate the "form" with the existing information for this comment
    // Contents default = empty, so fill it with the old comment
    let old_contents = comment_ele.querySelector('.' + CLASS_COMMENT_CONTENTS).innerHTML.trim();
    editor_ele.querySelector('#' + ID_COMMENT_TEXTAREA).value = old_contents;

    if(want_settings){
        // Private status default == true
        let old_private_status = comment_ele.dataset.is_private;
        if(old_private_status.toLowerCase() == 'false'){
            editor_ele.querySelector('#' + ID_COMMENT_CHECKBOX_PRIVATE).checked = false;
        }
    
        // Pinned status default == false
        let old_pinned_status = comment_ele.dataset.is_pinned;
        if(old_pinned_status.toLowerCase() == 'true'){
            editor_ele.querySelector('#' + ID_COMMENT_CHECKBOX_PINNED).checked = true;
        }
    
        // Highlighted status default == false
        let old_highlighted_status = comment_ele.dataset.is_highlighted;
        if(old_highlighted_status.toLowerCase() == 'true'){
            editor_ele.querySelector('#' + ID_COMMENT_CHECKBOX_HIGHLIGHTED).checked = true;
        }        
    }

    return editor_ele;
}

// Open Edit Mode: hide/show the "read" portions of the comments as required
function visibility_comment_content(comment_ele, want_visibility){
    let details_ele = comment_ele.querySelector('details');
    if(details_ele == null) return;

    visibility_element(comment_ele.querySelector('details'), want_visibility);

    if(want_visibility){
        // Re-hides the comment footer
        details_ele.removeAttribute('open');
    }
    return;
}

// Open Create/Edit Mode: hide/show the add comment button
function visibility_add_comment_btn(want_visibility){

    if(want_visibility){
        unhide_all_by_class(CLASS_ADD_COMMENT_SIMPLIFIED);
    }
    else {
        hide_all_by_class(CLASS_ADD_COMMENT_SIMPLIFIED);
    }
    
    visibility_element(document.getElementById(ID_ADD_COMMENT_WITH_SETTINGS_BTN), want_visibility);
}

















// --------------------------------------------------------------------------------------------
// Backend (Create, Update)
// --------------------------------------------------------------------------------------------
// Backend (Create, Update): called onclick of the "save" button on the JobComment "form"
// Sends data to the backend then calls the appropriate page update function.

async function save_job_comment(btn){
    if(btn.dataset.form_type == VALUE_FORM_TYPE_CONTENT_ONLY){
        data = make_jobcomment_dict_simplified(btn);   
    }
    else {
        data = make_jobcomment_dict_with_settings();
    }

    let response = await backend_save_job_comment(btn, data);

    // Case: "new comment". Add a new comment div to the list
    let comment_id = btn.dataset.comment_id;
    if(comment_id == '0'){
        update_job_page_comments_after_create(response); 
    }

    // Case: "smart-arse tried to edit someone else's comment". Add a chastising message to the page
    else if('denied' in response){
        update_job_page_comments_after_denied(response['denied'], btn.closest('.' + CLASS_INDIVIDUAL_COMMENT_ELE));
    }

    // Case: "update comment". Adjust the existing div
    else {
        update_job_page_comments_after_update(response);
    }    
}

function make_jobcomment_dict_with_settings(){
    let result = {};

    // Set defaults appropriate to the "with settings" form.
    result['contents'] = document.getElementById(ID_COMMENT_TEXTAREA).value;
    result['private'] = true;
    result['pinned'] = false;
    result['highlighted'] = false;

    // Replace defaults with checkbox contents, if there are any.
    // This will happen to all comments submitted via the "full" form (i.e. Job page and Job Comments page)
    let private_checkbox = document.getElementById(ID_COMMENT_CHECKBOX_PRIVATE);
    if(private_checkbox != null){
        result['private'] = private_checkbox.checked;
    }

    let pinned_checkbox = document.getElementById(ID_COMMENT_CHECKBOX_PINNED);
    if(pinned_checkbox != null){
        result['pinned'] = pinned_checkbox.checked;
    }

    let highlighted_checkbox = document.getElementById(ID_COMMENT_CHECKBOX_HIGHLIGHTED);
    if(highlighted_checkbox != null){
        result['highlighted'] = highlighted_checkbox.checked;
    }    

    return result;
}

function make_jobcomment_dict_simplified(btn){
    // The simplified form only has a textarea, with no way to set status toggles, so we must decide on the status toggles on the user's behalf.

    // Assumption/decision:
    // Existing comment: the status toggles should not change (it'd be weird to fix a typo and suddenly private=true).

    // This bit is the same for create and edit.
    let result = {};
    result['contents'] = document.getElementById(ID_COMMENT_TEXTAREA).value;

    // Set default status toggles for use on new comments.
    //  >> Presently the simplified form is only in use on the todo list, which only displays pinned comments. As such, "pinned = true" is a reasonable assumption.
    //  >> "private = true" is a safer default than the alternative.
    //  >> "highlight = false" because highlighting is really intended for picking out the wheat from the chaff on the Job Comments page.
    result['private'] = true;
    result['pinned'] = true;
    result['highlighted'] = false;

    // If the user is editing an existing comment, the button will be inside a comment div with the existing settings stored as attributes.
    // Replace the defaults with those, if they exist.
    let comment_ele = btn.closest(`.${CLASS_INDIVIDUAL_COMMENT_ELE}`);
    if(comment_ele != null){
        result['private'] = comment_ele.dataset.is_private.toLowerCase() == 'true';
        result['pinned'] = comment_ele.dataset.is_pinned.toLowerCase() == 'true';
        result['highlighted'] = comment_ele.dataset.is_highlighted.toLowerCase() == 'true';
    }

    return result;
}



// Backend (all): determine the URL for Job Comments
function get_jobcomments_url(ele_inside_comment_div){
    //  The URL for POSTing data contains the job ID number, which needs to be handled slightly differently on different pages.
    if(typeof URL_JOB_COMMENTS !== 'undefined'){
        // If the page covers a single job, all comments on the page will use the same URL, which will be declared as a const in the script tags.
        return URL_JOB_COMMENTS;
    }
    else {
        // If the page covers multiple jobs, each will need a different URL. Each job will have its own container for pinned comments,
        // so the URL is added there as a dataset attribute.
        let container_div = ele_inside_comment_div.closest(`.${CLASS_COMMENT_SECTION}`);
        return container_div.dataset.url_comments;
    }
}



// Backend (Create, Update): prepare the data and send it off to the server
async function backend_save_job_comment(btn, data){
    let url = get_jobcomments_url(btn);
    let response = await fetch(`${url}?id=${btn.dataset.comment_id}`, {
        method: 'POST',
        body: JSON.stringify({
            'contents': data['contents'],
            'private': data['private'],
            'pinned': data['pinned'],
            'highlighted': data['highlighted']
        }),
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .catch(error => {
        console.log('Error: ', error);
    });

    return await response.json();
}

// --------------------------------------------------------------------------------------------
// Backend (Delete)
// --------------------------------------------------------------------------------------------
// Backend (Delete): called onclick
async function delete_job_comment(btn){
    let comment_ele = btn.closest('.' + CLASS_INDIVIDUAL_COMMENT_ELE);
    let response = await delete_job_comment_on_server(btn, comment_ele.dataset.comment_id);
    if('denied' in response){
        update_job_page_comments_after_denied(response['denied'], comment_ele);
    } else {
        update_job_page_comments_after_delete(comment_ele.dataset.comment_id);
    }
}

// Send the data off, then return the response
async function delete_job_comment_on_server(btn, comment_id){
    let url = get_jobcomments_url(btn);
    let response = await fetch(`${url}?id=${comment_id}`, {
        method: 'POST',
        body: JSON.stringify({
            'task': 'delete'
        }),
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .catch(error => {
        console.log('Error: ', error);
    })

    return await response.json();
}



















// --------------------------------------------------------------------------------------------
// Frontend End: following JobComment Create
// --------------------------------------------------------------------------------------------
// DOM (Create): main function, managing post-creation frontend changes
function update_job_page_comments_after_create(response){
    close_jobcomment_editor();

    let class_to_find_comment = get_class_to_find_comment(response['id']);

    add_comment_to_section(class_to_find_comment, CLASS_ALL_COMMENTS_CONTAINER, response);

    if(response['pinned']){
        add_comment_to_section(class_to_find_comment, CLASS_PINNED_COMMENTS_CONTAINER, response);
    }

    if(response['highlighted']){
        add_comment_to_section(class_to_find_comment, CLASS_HIGHLIGHTED_COMMENTS_CONTAINER, response);
    }

    remove_all_jobcomment_warnings();
}


// DOM (Create Comment Ele): Make a new comment element. Broken up into multiple functions.
function create_ele_new_comment(response){
    let container_ele = document.createElement('article');

    container_ele.classList.add(CLASS_INDIVIDUAL_COMMENT_ELE);
    container_ele.classList.add(`${CLASS_PREFIX_FOR_COMMENT_ID}${response['id']}`);

    if(response['highlighted']){
        container_ele.classList.add(CLASS_HIGHLIGHTED_CSS);
    }

    container_ele.setAttribute('data-comment_id', response['id']);
    container_ele.setAttribute('data-is_private', response['private']);
    container_ele.setAttribute('data-is_pinned', response['pinned']);
    container_ele.setAttribute('data-is_highlighted', response['highlighted']);

    let details_ele = document.createElement('details');
    details_ele.append(create_ele_comment_summary(response['private'], response['contents']));
    details_ele.append(create_ele_comment_hidden_details(response['username'], response['timestamp'], response['pinned']));

    container_ele.append(details_ele);
    apply_event_listeners_to_comment(container_ele);

    return container_ele;    
}


function create_ele_comment_summary(is_private, body_str){
    let summary_ele = document.createElement('summary');
    let main_ele = document.createElement('span');
    main_ele.classList.add(CLASS_COMMENT_MAIN);
    if(is_private){
        main_ele.append(get_comment_privacy_status_ele());
    }
    main_ele.append(create_ele_comment_body_streamlined(body_str));
    summary_ele.append(main_ele);
    return summary_ele;
}

function create_ele_comment_hidden_details(username, timestamp, is_pinned){
    let footer_ele = document.createElement('section');
    footer_ele.classList.add(CLASS_COMMENT_FOOTER);
    footer_ele.append(create_ele_comment_ownership(username, timestamp));
    footer_ele.append(create_ele_comment_controls(is_pinned));
    return footer_ele;
}







// function get_new_comment_div(response, streamline_comment){
//     let container_ele = document.createElement('article');

//     container_ele.classList.add(CLASS_INDIVIDUAL_COMMENT_ELE);
//     container_ele.classList.add(`${CLASS_PREFIX_FOR_COMMENT_ID}${response['id']}`);

//     if(streamline_comment){
//         container_ele.classList.add(CLASS_HOVER_PARENT);
//     }

//     if(response['private']){
//         container_ele.classList.add('private');
//     } else {
//         container_ele.classList.add('public');
//     }

//     if(response['highlighted']){
//         container_ele.classList.add(CLASS_HIGHLIGHTED_CSS);
//     }

//     container_ele.setAttribute('data-comment_id', response['id']);
//     container_ele.setAttribute('data-is_private', response['private']);
//     container_ele.setAttribute('data-is_pinned', response['pinned']);
//     container_ele.setAttribute('data-is_highlighted', response['highlighted']);

//     let upper_ele = document.createElement('section');
//     upper_ele.classList.add(CLASS_COMMENT_MAIN);
//     upper_ele.append(create_comment_body(response['contents']));
//     upper_ele.append(create_comment_controls(response['pinned'], streamline_comment));
//     container_ele.append(upper_ele);

//     let lower_ele = document.createElement('section');
//     lower_ele.classList.add(CLASS_COMMENT_FOOTER);
//     if(streamline_comment){
//         lower_ele.classList.add('hover-child');
//     }

//     lower_ele.append(create_comment_ownership(response['username'], response['timestamp'], response['private']));
//     container_ele.append(lower_ele);

//     apply_event_listeners_to_comment(container_ele);

//     return container_ele;
// }

// DOM (Create Comment): JobComment div with the comment itself inside
function create_ele_comment_body_streamlined(contents){
    let ele = document.createElement('span');
    ele.classList.add(CLASS_COMMENT_CONTENTS);
    ele.innerHTML = contents;
    return ele;
}

function create_ele_comment_body(contents){
    let contents_ele = document.createElement('div');
    contents_ele.classList.add(CLASS_COMMENT_CONTENTS);

    let ele = document.createElement('span');
    ele.innerHTML = contents;
    contents_ele.append(ele);

    return contents_ele;
}

// DOM (Create Comment): JobComment div with the pinned and edit buttons inside
function create_ele_comment_controls(is_pinned){
    let controls_ele = document.createElement('div');
    controls_ele.classList.add(CLASS_COMMENT_CONTROLS);

    let pinned_btn = document.createElement('button');
    pinned_btn.classList.add(CLASS_COMMENT_PINNED_TOGGLE);
    if(is_pinned){
        pinned_btn.classList.add(CLASS_PINNED_BTN_ON);
        pinned_btn.innerHTML = 'unpin';
    } else {
        pinned_btn.classList.add(CLASS_PINNED_BTN_OFF);
        pinned_btn.innerHTML = 'pin';
    }
    controls_ele.append(pinned_btn);

    let highlighted_btn = document.createElement('button');
    highlighted_btn.classList.add(CLASS_COMMENT_HIGHLIGHTED_TOGGLE);
    highlighted_btn.innerHTML = '+/- highlight';
    controls_ele.append(highlighted_btn);
    
    let edit_btn = document.createElement('button');
    edit_btn.classList.add(CLASS_COMMENT_EDIT_BTN);
    edit_btn.innerHTML = 'edit';
    controls_ele.append(edit_btn);

    return controls_ele;
}

// DOM (Create Comment): JobComment div with the user, timestamp and privacy status inside
function create_ele_comment_ownership(username, timestamp){
    let result = document.createElement('div');
    result.classList.add('ownership');
    result.innerHTML = `${username} on ${timestamp}`;
    return result;
}

// DOM (Create): Apply event listeners to a comment's buttons. (Doing this separately so it can also be used by clones.)
function apply_event_listeners_to_comment(comment_div){

    add_event_listener_if_element_exists(comment_div.querySelector('.' + CLASS_COMMENT_EDIT_BTN), (e) => {
        open_jobcomment_editor_for_update(e.target);
    });

    add_event_listener_if_element_exists(comment_div.querySelector('.' + CLASS_COMMENT_PINNED_TOGGLE), (e) => {
        toggle_status(e.target, 'pinned');
   });

    add_event_listener_if_element_exists(comment_div.querySelector('.' + CLASS_COMMENT_HIGHLIGHTED_TOGGLE), (e) => {
         toggle_status(e.target, 'highlighted');
    });

}

function add_event_listener_if_element_exists(element, called_function){
    if(element !== null){
        element.addEventListener('click', called_function);
    }
}






// --------------------------------------------------------------------------------------------
// Frontend End: following JobComment Update
// --------------------------------------------------------------------------------------------
// DOM (Update): called by the handler function
function update_job_page_comments_after_update(response){
    // Remove the edit form
    close_jobcomment_editor();

    // The user could've updated a status that affects where/how many times the comment appears on the page, so handle that next
    update_presence_in_filtered_comment_sections(response);

    // Update all remaining copies of this comment to reflect the changes the user just made
    document.querySelectorAll(`.${CLASS_PREFIX_FOR_COMMENT_ID}${response['id']}`).forEach(ele =>{
        update_comment_ele(response, ele);
    });
}

// DOM (Update): Loop through all "special" comment sections, ensuring the updated comment appears where it should.
function update_presence_in_filtered_comment_sections(response){
    for(let i = 0; i < SECTION_NAMES.length; i++){
        // "all-comments" is not considered "filtered", so skip that one.
        //if(SECTION_NAMES[i] != CLASS_ALL_COMMENTS_CONTAINER){
            update_presence_in_filtered_comment_section(response, SECTION_NAMES[i]);
        //}
    }
    return;
}

// DOM (Update/Delete): Check if the updated comment should appear in this one specific section and update accordingly.
function update_presence_in_filtered_comment_section(response, section_class){
    let class_to_find_comment = `${CLASS_PREFIX_FOR_COMMENT_ID}${response['id']}`;

    if(!response[section_class]){
        remove_comment_from_section(class_to_find_comment, section_class);
    }
    else if(response[section_class]){
        add_comment_to_section(class_to_find_comment, section_class, response);
    }
    return;
}


// DOM (Update): Dig into a standard comment element and update everything.
function update_comment_ele(response, comment_ele){
    // Update where the comment contents are displayed
    let contents_ele = comment_ele.querySelector('.' + CLASS_COMMENT_CONTENTS);
    contents_ele.innerHTML = response['contents'];

    // Update toggle-able statuses
    update_frontend_comment_pinned_status(comment_ele, response['pinned']);
    update_frontend_comment_highlighted_status(comment_ele, response['highlighted']);
    update_frontend_comment_private_status(comment_ele, response['private']);
}

// DOM Update / DOM Pinned Toggle: update the pinned button
function update_comment_pinned_btn(pinned_btn, want_on){
    let is_on = pinned_btn.classList.contains(CLASS_PINNED_BTN_ON);
    if(is_on && !want_on){
        pinned_btn.classList.remove(CLASS_PINNED_BTN_ON);
        pinned_btn.classList.add(CLASS_PINNED_BTN_OFF);
        pinned_btn.innerHTML = 'pin';
    }
    else if(!is_on && want_on){
        pinned_btn.classList.add(CLASS_PINNED_BTN_ON);
        pinned_btn.classList.remove(CLASS_PINNED_BTN_OFF);
        pinned_btn.innerHTML = 'unpin';
    }
    return;
}



// DOM (Update/Create): Get privacy-status element
function get_comment_privacy_status_ele(){
    let result = document.createElement('div');
    result.classList.add(CLASS_PRIVACY_STATUS);
    result.innerHTML = '[PRIVATE]';
    return result;
}




// --------------------------------------------------------------------------------------------
// Frontend End: following JobComment Denied
// --------------------------------------------------------------------------------------------
// DOM Denied: called by handler function
function update_job_page_comments_after_denied(response_str, comment_ele){
    close_jobcomment_editor();

    let contents_ele = comment_ele.querySelector('.contents');
    let access_denied_ele = get_access_denied_ele(response_str);
    contents_ele.prepend(access_denied_ele);
}

// DOM Denied: create the message element
function get_access_denied_ele(response_str){
    let result = document.createElement('p');
    result.classList.add(CLASS_ACCESS_DENIED);
    result.innerHTML = response_str;
    return result;
}



// --------------------------------------------------------------------------------------------
// Frontend End: following JobComment Delete
// --------------------------------------------------------------------------------------------
function update_job_page_comments_after_delete(comment_id){
    // Update all remaining copies of this comment to reflect the changes the user just made
    document.querySelectorAll(`.${CLASS_PREFIX_FOR_COMMENT_ID}${comment_id}`).forEach(ele =>{
        let container = ele.closest(`.${CLASS_COMMENTS_CONTAINER}`);
        ele.remove();
        handle_section_emptiness(container);
    });
}



// --------------------------------------------------------------------------------------------
// JobComment Utils
// --------------------------------------------------------------------------------------------
function get_class_to_find_comment(comment_id){
    return `${CLASS_PREFIX_FOR_COMMENT_ID}${comment_id}`;
}

// JobComment utils: remove any warnings
function remove_all_jobcomment_warnings(){
    document.querySelectorAll('.' + CLASS_ACCESS_DENIED).forEach(ele => {
        ele.remove();
    });
}

// JobComment utils: hide/show an element via a CSS class as required
function visibility_element(element, want_visibility){
    if(element == null){
        // If the element doesn't exist then it's as hidden as hidden can be, which is great if we wanted to hide it.
        // If we wanted to show it then eh, can't hope to fix that with a CSS class, so just give up.
        return;
    }

    let have_visibility = !element.classList.contains('hide');
    if(want_visibility && !have_visibility){
        element.classList.remove('hide');
    }
    else if(!want_visibility && have_visibility){
        element.classList.add('hide');
    }
    return;
}











// --------------------------------------------------------------------------------------------
// Toggle Status
// --------------------------------------------------------------------------------------------

function toggle_status(btn, toggled_attribute){

    let comment_ele = btn.closest('.' + CLASS_INDIVIDUAL_COMMENT_ELE);
    if(comment_ele == null){
        return;
    }

    if('pinned' == toggled_attribute){
        var previous_attr = comment_ele.dataset.is_pinned;
    }
    else if('highlighted' == toggled_attribute){
        var previous_attr = comment_ele.dataset.is_highlighted;
    }
    else {
        console.log("Error: Can't find previous comment status");
        return;
    }

    var previous = previous_attr.toLowerCase() == 'true';
    
    update_backend_for_comment_toggle(comment_ele.dataset.comment_id, !previous, toggled_attribute);
    update_frontend_for_comment_toggle(comment_ele, !previous, toggled_attribute);
}

function update_backend_for_comment_toggle(comment_id, new_status, toggled_attribute){
    fetch(`${URL_COMMENT_STATUS}?id=${comment_id}`, {
        method: 'POST',
        body: JSON.stringify({
            'task': 'toggle',
            'toggle_to': new_status,
            'mode': toggled_attribute
        }),
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
}

function update_frontend_for_comment_toggle(comment_ele, new_status, toggled_attribute){
    // Depending on toggle status and which page we're on, there could be multiple instances of the
    // same comment displayed on the page: all will need to be updated following a toggle.
    // To avoid worrying about which specific sections are currently visible, we will find the comments
    // via a special class shared by all instances of the same comment.
    let class_to_find_comment = get_class_to_find_comment(comment_ele.dataset.comment_id);

    // Some pages display comments in sections based on a particular status being true (e.g. highlighted comments).
    // If a section-y status is toggled to false, the comment should be removed from that section.
    // Handle that first to avoid wasting time updating that comment.
    if(!new_status){
        remove_comment_from_section(class_to_find_comment, toggled_attribute);
    }

    // Look for instances of the comment still remaining on the page and update them.
    document.querySelectorAll(`.${class_to_find_comment}`).forEach(comment_ele => {
        if('pinned' == toggled_attribute){
            update_frontend_comment_pinned_status(comment_ele, new_status);
        }
        else if('highlighted' == toggled_attribute){
            update_frontend_comment_highlighted_status(comment_ele, new_status);
        }
    });

    // If a section-y status is toggled to true, a copy of the comment should be added to the section.
    // We'll aim to do that by copying a now-updated comment to that section.
    if(new_status){
        add_comment_to_section(class_to_find_comment, toggled_attribute);
    }
}


function get_comment_data_from_ele(ele){
    let result = {};
    result['id'] = ele.dataset.comment_id;
    result['footer_str'] = ele.querySelector(`.${CLASS_COMMENT_OWNERSHIP}`).innerHTML.trim();
    result['contents'] = ele.querySelector(`.${CLASS_COMMENT_CONTENTS}`).innerHTML.trim();
    result['private'] = ele.dataset.is_private;
    result['pinned'] = ele.dataset.is_pinned;
    result['highlighted'] = ele.dataset.is_highlighted;

    return result;
}


function update_frontend_comment_pinned_status(comment_ele, is_pinned){
    comment_ele.setAttribute('data-is_pinned', is_pinned);

    let pinned_btn = comment_ele.querySelector('.' + CLASS_COMMENT_PINNED_TOGGLE);
    update_comment_pinned_btn(pinned_btn, is_pinned);

    return;
}

function update_frontend_comment_highlighted_status(comment_ele, is_highlighted){
    comment_ele.setAttribute('data-is_highlighted', is_highlighted);

    let have_highlighted = comment_ele.classList.contains(CLASS_HIGHLIGHTED_CSS);
    if(is_highlighted && !have_highlighted){
        comment_ele.classList.add(CLASS_HIGHLIGHTED_CSS);
    }
    else if(!is_highlighted && have_highlighted){
        comment_ele.classList.remove(CLASS_HIGHLIGHTED_CSS);
    }

    return;
}

function update_frontend_comment_private_status(comment_ele, is_private){
    comment_ele.setAttribute('data-is_private', is_private);
    let have_private_class = comment_ele.classList.contains('private');
    
    if(have_private_class && !is_private){
        comment_ele.classList.remove('private');
    }
    else if(!have_private_class && is_private){
        comment_ele.classList.add('private');
    }

    // Update where private/public status is displayed
    // Note: I'd prefer to only update the DOM if this /needs/ to change, but the placeholder version doesn't support that well.
    // If later on there ends up being a telling CSS class or something, add something smarter. :)
    let privacy_ele = comment_ele.querySelector('.' + CLASS_PRIVACY_STATUS);
    if(privacy_ele == null){
        return;
    }

    privacy_ele.before(get_comment_privacy_status_ele(is_private));
    privacy_ele.remove();
    return;
}




function add_comment_to_section(class_to_find_comment, section_name, comment_data=null){

    // If the section doesn't exist at all, there's nowhere to add the comment to, so we're done.
    let section_ele = document.querySelector(`.${CLASS_COMMENTS_CONTAINER}.${section_name}`);
    if(section_ele == null){
        return;
    }

    // If something's gone askew and the comment already exists in the target section, don't add it again.
    let existing_comment_in_section = section_ele.querySelector(`.${class_to_find_comment}`);
    if(existing_comment_in_section !== null){
        return;
    }

    // If a comment is being added to a new section because the user clicked a toggle button, there won't be any comment_data,
    // but there should be an instance of the same comment on the page (because that's where the user found a toggle button to click),
    // so try getting the necessary data from there.
    if(comment_data === null){
        let existing_comment = document.querySelector(`.${class_to_find_comment}`);
        if(existing_comment !== null){
            comment_data = get_comment_data_from_ele(existing_comment);
        }
        else {
            // No data, no comment. Give up.
            return;
        }
    }

    let want_streamline_comment = section_name == CLASS_PINNED_COMMENTS_CONTAINER;
    var section_comment = create_ele_new_comment(comment_data, want_streamline_comment);

     

    // if(existing_comment != null){
    //     var section_comment = existing_comment.cloneNode(true);
    //     apply_event_listeners_to_comment(section_comment);
    // }
    // else 
    // else{
    //     return;
    // }

    section_ele.prepend(section_comment);

    // Adding that comment might've affected the emptiness of this section, so sort out the emptiness paragraph if it did.
    handle_section_emptiness(section_ele, section_name);

    return;
}

function remove_comment_from_section(class_to_find_comment, section_name){
    document.querySelectorAll(`.${CLASS_COMMENTS_CONTAINER}.${section_name}`).forEach(section_ele => {
        let comment_in_section = section_ele.querySelector(`.${class_to_find_comment}`);

        // If the comment doesn't exist in the section then... well, it probably /should/ at this point,
        // given that this is a toggle, but whatever: all's well that ends well.
        if(comment_in_section != null){
            comment_in_section.remove();
            handle_section_emptiness(section_ele, section_name);
        }
    });

    return;
}


function handle_section_emptiness(comment_section_ele, section_name="?"){
    // If the calling function didn't share the section_name, attempt to work it out from the element.
    if(section_name === "?"){
        let attempted_section_name = pick_out_comment_section_name(comment_section_ele);
        if(attempted_section_name !== null){
            section_name = attempted_section_name;
        }
    }

    let section_is_empty = comment_section_ele.querySelectorAll(`.${CLASS_INDIVIDUAL_COMMENT_ELE}`).length == 0;
    let is_streamlined =  comment_section_ele.classList.contains(CLASS_PINNED_COMMENTS_CONTAINER);

    if(is_streamlined){
        var existing = comment_section_ele.parentElement.querySelector('h5');
        var want_add = !section_is_empty && existing === null;
        var want_remove = section_is_empty && existing !== null;
    }
    else {
        var existing = comment_section_ele.querySelector(`.${CLASS_EMPTY_SECTION_P}`);
        var want_add = section_is_empty && existing === null;
        var want_remove = !section_is_empty && existing !== null;
    }

    if(want_remove){
        existing.remove();
    }
    else if (want_add) {
        var ele = create_ele_comment_section_emptiness_conditional(section_name);
        if(is_streamlined){
            comment_section_ele.before(ele);
        } else {
            comment_section_ele.prepend(ele);
        }
    }




    // if(comment_section_ele.querySelectorAll(`.${CLASS_INDIVIDUAL_COMMENT_ELE}`).length == 0){

    //     // Handle an empty section.
    //     if(is_streamlined){
    //         // Streamlined = remove the heading, since there are no pinned comments now.
    //         if(existing !== null){
    //             existing.remove();
    //         }
    //     }
    //     else {
    //         // Other sections = add a note to indicate intentional emptiness.
    //         var ele = create_ele_comment_section_emptiness_conditional(section_name);
    //         comment_section_ele.prepend(ele);
    //     }
    // }
    // else{
    //     // Handle a not-empty section
    //     if(is_streamlined){
    //         // Streamlined = add a heading, unless it's already there somehow
    //         let existing = comment_section_ele.querySelector('h5');
    //         if(existing === null){
    //             var ele = create_ele_comment_section_emptiness_conditional(section_name);
    //             comment_section_ele.prepend(ele); 
    //         }
           
    //     }
    //     else {
    //         var ele = comment_section_ele.querySelector(`.${CLASS_EMPTY_SECTION_P}`);
    //         if(ele != null){
    //             ele.remove();
    //         }
    //     }
    // }
}

function pick_out_comment_section_name(ele){
    for(let s = 0; s < SECTION_NAMES.length; s++){
        if(ele.classList.contains(SECTION_NAMES[s])){
            return SECTION_NAMES[s];
        }
    }
    return null;
}

function OLD_pick_out_comment_section_name(class_name){
    let class_list = class_name.split(' ');
    for(let s = 0; s < SECTION_NAMES.length; s++){
        for(let c = 0; c < class_list.length; c++){

            if(SECTION_NAMES[s] == class_list[c]){
                return SECTION_NAMES[s];
            }
        }
    }
    return null;
}



function create_ele_comment_section_emptiness_conditional(section_name){
    // Special case: the "pinned" comments show a heading when there are comments and nothing when empty, so return the heading.
    if(section_name === CLASS_PINNED_COMMENTS_CONTAINER){
        let h5 = document.createElement('h5');
        h5.innerHTML = 'PINNED';
        return h5;
    }

    // General case: other comment sections have a persistent heading and display a note to indicate intentional emptiness.
    let p = document.createElement('p');
    p.classList.add(CLASS_EMPTY_SECTION_P);

    if(section_name == CLASS_HIGHLIGHTED_COMMENTS_CONTAINER){
        p.innerHTML = `No comments have been ${section_name}.`;
    }
    else {
        p.innerHTML = 'No comments have been added.';
    }
    
    return p;
}






