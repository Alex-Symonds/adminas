const ID_ADD_COMMENT_WITH_SETTINGS_BTN = 'id_add_job_comment_with_settings';
const DEFAULT_COMMENT_ID = '0';
const CLASS_COMMENT_EDIT_BTN = 'edit-comment';
const CLASS_COMMENT_DELETE_BTN = 'delete-comment-btn';
const CLASS_COMMENT_PINNED_TOGGLE = 'pinned-toggle';

const CLASS_COMMENT_CU_ELEMENT = 'job-comment-cu-container';
const ID_COMMENT_TEXTAREA = 'id_comment_contents';
const ID_COMMENT_CHECKBOX_PRIVATE = 'id_private_checkbox';
const ID_COMMENT_CHECKBOX_PINNED = 'id_pinned_checkbox';

const CLASS_INDIVIDUAL_COMMENT_CONTAINER = 'one-comment';
const CLASS_COMMENT_MAIN = 'main';
const CLASS_COMMENT_CONTENTS = 'contents';
const CLASS_COMMENT_CONTROLS = 'controls';
const CLASS_COMMENT_FOOTER = 'footer';

const CLASS_PINNED_BTN_ON = 'pinned-status-on';
const CLASS_PINNED_BTN_OFF = 'pinned-status-off';
const CLASS_PRIVACY_STATUS = 'privacy-status';

const CLASS_ACCESS_DENIED = 'access-denied';

const CLASS_PREFIX_FOR_COMMENT_CONTAINER = 'comment-container-';
const CLASS_ALL_COMMENTS_CONTAINER = 'comment-container-all';
const CLASS_PINNED_COMMENTS_CONTAINER = 'comment-container-pinned';
const CLASS_HIGHLIGHTED_COMMENTS_CONTAINER = 'comment-container-highlighted';
const CLASS_PREFIX_FOR_COMMENT_ID = 'id-';

// Assign event listeners onload
document.addEventListener('DOMContentLoaded', () => {

    document.getElementById(ID_ADD_COMMENT_WITH_SETTINGS_BTN).addEventListener('click', ()=>{
        open_create_job_comment_form_with_settings(DEFAULT_COMMENT_ID);
    });

    document.querySelectorAll('.' + CLASS_COMMENT_EDIT_BTN).forEach(btn => {
        btn.addEventListener('click', (e) => {
            open_edit_job_comment(e.target);
        })
    });

    document.querySelectorAll('.' + CLASS_COMMENT_PINNED_TOGGLE).forEach(btn => {
        btn.addEventListener('click', (e) => {
            toggle_pinned_status(e.target);
        });
    });

});







// --------------------------------------------------------------------------------------------
// Open Create/Update Mode
// --------------------------------------------------------------------------------------------
// Open Create Mode: called onclick
function open_create_job_comment_form_with_settings(comment_id){
    // The "form" uses IDs, so close the old before opening the new.
    close_create_job_comment_form_with_settings();

    // Proceed with opening the new
    let job_comment_form = create_job_comment_form_with_settings(comment_id);
    let anchor_ele = document.getElementById(ID_ADD_COMMENT_WITH_SETTINGS_BTN);
    anchor_ele.after(job_comment_form);

    // Attempt to discourage multiple forms via hiding the buttons
    visibility_add_comment_btn(false);
    hide_all_by_class(CLASS_COMMENT_EDIT_BTN);
}

// Open Create Mode (also used for Update): all-in-one function to create a "form" for a Job comment, including the checkboxes for private and pinned display
function create_job_comment_form_with_settings(comment_id){
    let container = document.createElement('div');
    container.classList.add(CLASS_COMMENT_CU_ELEMENT);

    let h = document.createElement('h4');
    if(comment_id == DEFAULT_COMMENT_ID){
        h.innerHTML = 'Add Comment';
    } else {
        h.innerHTML = 'Editing';
    }
    container.append(h);

    let main_input = document.createElement('textarea');
    main_input.name = 'contents';
    main_input.id = ID_COMMENT_TEXTAREA;
    main_input.cols = 30;
    main_input.rows = 5;
    container.append(main_input);

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

    let save_btn = document.createElement('button');
    save_btn.innerHTML = 'save';
    save_btn.setAttribute('data-comment_id', comment_id);
    save_btn.addEventListener('click', (e) => {
        save_job_comment_with_settings(e.target);
    });
    container.append(save_btn);

    if(comment_id != DEFAULT_COMMENT_ID){
        let delete_btn = document.createElement('button');
        delete_btn.classList.add(CLASS_COMMENT_DELETE_BTN);
        delete_btn.innerHTML = 'delete';
        delete_btn.addEventListener('click', (e) => {
            delete_job_comment(e.target);
        });
        container.append(delete_btn);
    }

    let close_btn = document.createElement('button');
    close_btn.innerHTML = 'cancel';
    close_btn.addEventListener('click', () => {
        close_create_job_comment_form_with_settings();
    });
    container.append(close_btn);

    return container;
}


// Cancel Create/Update Mode: called onclick of the "cancel" button located in the JobComment "form"
function close_create_job_comment_form_with_settings(){
    let ele = document.querySelector('.' + CLASS_COMMENT_CU_ELEMENT);
    if(ele == null){
        // It's not open, so there's nothing to close
        return;
    }

    // Attempt to use ele to set the comment_ele prior to removal
    let comment_ele = ele.closest('.' + CLASS_INDIVIDUAL_COMMENT_CONTAINER);
    ele.remove();

    // Create: there is no "closest" individual comment div, so the assignment above will fail and we skip this part.
    // Update: the form is inside a comment div, so the assignment will have succeeded. This also means the "read" parts
    // of the comment div will have been hidden during editing, so unhide them now.
    if(comment_ele != null){
        visibility_edit_mode(comment_ele, true);
    }

    // Create and Update: restore visibility to the "form" opening buttons
    visibility_add_comment_btn(true);
    unhide_all_by_class(CLASS_COMMENT_EDIT_BTN);
    return;
}


// Open Edit Mode: called onclick of an edit button
function open_edit_job_comment(btn){
    let comment_container = btn.closest('.' + CLASS_INDIVIDUAL_COMMENT_CONTAINER);
    let edit_mode_ele = edit_job_comment_form_with_settings(comment_container);
    comment_container.prepend(edit_mode_ele);
    visibility_edit_mode(comment_container, false);
}

// Open Edit Mode: borrow the function from "create" mode to get the "form", but this time populate it with the existing comment's contents and settings
function edit_job_comment_form_with_settings(comment_container){
    let comment_id = comment_container.dataset.comment_id;
    let base_element = create_job_comment_form_with_settings(comment_id);

    // Populate the "form" with the existing information for this comment
    // Contents default = empty, so fill it with the old comment
    let old_contents = comment_container.querySelector('.' + CLASS_COMMENT_CONTENTS).querySelector('p').innerHTML;
    base_element.querySelector('#' + ID_COMMENT_TEXTAREA).value = old_contents;

    // Private status default == true
    let old_private_status = comment_container.dataset.is_private;
    if(old_private_status.toLowerCase() == 'false'){
        base_element.querySelector('#' + ID_COMMENT_CHECKBOX_PRIVATE).checked = false;
    }

    // Pinned status default == false
    let old_pinned_status = comment_container.dataset.is_pinned;
    if(old_pinned_status.toLowerCase() == 'true'){
        base_element.querySelector('#' + ID_COMMENT_CHECKBOX_PINNED).checked = true;
    }

    return base_element;
}

// Open Edit Mode: hide/show the "read" portions of the comments as required
function visibility_edit_mode(comment_ele, want_visibility){
    visibility_element(comment_ele.querySelector('.' + CLASS_COMMENT_MAIN), want_visibility);
    visibility_element(comment_ele.querySelector('.' + CLASS_COMMENT_FOOTER), want_visibility);
    return;
}

// Open Create/Edit Mode: hide/show the add comment button
function visibility_add_comment_btn(want_visibility){
    visibility_element(document.getElementById(ID_ADD_COMMENT_WITH_SETTINGS_BTN), want_visibility);
}

















// --------------------------------------------------------------------------------------------
// Backend (Create, Update)
// --------------------------------------------------------------------------------------------
// Backend (Create, Update): called onclick of the "save" button on the JobComment "form"
// Sends data to the backend then calls the appropriate page update function.
async function save_job_comment_with_settings(btn){
    let comment_id = btn.dataset.comment_id;
    let response = await save_job_comment(btn);

    // Case: "new comment". Add a new comment div to the list
    if(comment_id == '0'){
        update_job_page_comments_after_create(response);
    }
    // Case: "smart-arse tried to edit someone else's comment". Add a chastising message to the page
    else if('denied' in response){
        update_job_page_comments_after_denied(response['denied'], btn.closest('.' + CLASS_INDIVIDUAL_COMMENT_CONTAINER));
    }
    // Case: "update comment". Adjust the existing div
    else {
        update_job_page_comments_after_update(response);
    }
}

// Backend (Create, Update): prepare the data and send it off to the server
async function save_job_comment(btn){
    // This function will be called in two situations:
    //  1) From the Job page, where there are checkboxes to flag a comment for privacy and pinned.
    //  2) From the to-do list, where it's a more compact display and has no checkboxes.
    // If there's a checkbox, use the value the user has set; if not, default to true for both.
    // This default is based on the assumptions that: adding a comment via the todo list implies the user wants it pinned (making it appear on the todo list);
    // pinned comments are intended to serve as reminders for the user, so more often than not it won't be of public interest anyway;
    // private = true is a safer default than the alternative.

    let contents = document.getElementById(ID_COMMENT_TEXTAREA).value;

    let want_private = true;
    let private_checkbox = document.getElementById(ID_COMMENT_CHECKBOX_PRIVATE);
    if(private_checkbox != null){
        want_private = private_checkbox.checked;
    }

    let want_pinned = true;
    let pinned_checkbox = document.getElementById(ID_COMMENT_CHECKBOX_PINNED);
    if(pinned_checkbox != null){
        want_pinned = pinned_checkbox.checked;
    }

    let response = await fetch(`${URL_JOB_COMMENTS}?id=${btn.dataset.comment_id}`, {
        method: 'POST',
        body: JSON.stringify({
            'contents': contents,
            'private': want_private,
            'pinned': want_pinned
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
    let comment_container = btn.closest('.' + CLASS_INDIVIDUAL_COMMENT_CONTAINER);
    let response = await delete_job_comment_on_server(comment_container.dataset.comment_id);
    if('denied' in response){
        update_job_page_comments_after_denied(response['denied'], comment_container);
    } else {
        update_job_page_comments_after_delete(comment_container.dataset.comment_id);
    }
}

// Send the data off, then return the response
async function delete_job_comment_on_server(comment_id){
    let response = await fetch(`${URL_JOB_COMMENTS}?id=${comment_id}`, {
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
// DOM following JobComment Create
// --------------------------------------------------------------------------------------------
// DOM (Create): Main "create mode" DOM updater
function update_job_page_comments_after_create(response){
    close_create_job_comment_form_with_settings();

    let new_comment_div = get_new_comment_div(response);
    let container_ele = document.querySelector('.' + CLASS_ALL_COMMENTS_CONTAINER);
    container_ele.prepend(new_comment_div);

    if(response['pinned']){
        let pinned_container_ele = document.querySelector('.' + CLASS_PINNED_COMMENTS_CONTAINER);
        let pinned_new_div = new_comment_div.cloneNode(true);
        apply_event_listeners_to_comment(pinned_new_div);
        pinned_container_ele.prepend(pinned_new_div);
    }

    if(response['highlighted']){
        let highlighted_container_ele = document.querySelector('.' + CLASS_HIGHLIGHTED_COMMENTS_CONTAINER);
        let highlighted_new_div = new_comment_div.cloneNode(true);
        apply_event_listeners_to_comment(highlighted_new_div);
        highlighted_container_ele.prepend(highlighted_new_div);
    }

    remove_all_jobcomment_warnings();
}


// DOM (Create): Make a new comment storing div. Broken up into multiple functions.
function get_new_comment_div(response){
    let container_ele = document.createElement('article');
    container_ele.classList.add(CLASS_INDIVIDUAL_COMMENT_CONTAINER);
    container_ele.classList.add(`${CLASS_PREFIX_FOR_COMMENT_ID}${response['id']}`);

    if(response['private']){
        container_ele.classList.add('private');
    } else {
        container_ele.classList.add('public');
    }

    container_ele.setAttribute('data-comment_id', response['id']);
    container_ele.setAttribute('data-is_private', response['private']);
    container_ele.setAttribute('data-is_pinned', response['pinned']);
    container_ele.setAttribute('data-is_highlighted', response['highlighted']);

    let upper_ele = document.createElement('section');
    upper_ele.classList.add(CLASS_COMMENT_MAIN);
    upper_ele.append(create_comment_body(response['contents']));
    upper_ele.append(create_comment_controls(response['pinned']));

    container_ele.append(upper_ele);

    let lower_ele = document.createElement('section');
    lower_ele.classList.add(CLASS_COMMENT_FOOTER);
    lower_ele.append(create_comment_ownership(response['username'], response['timestamp'], response['private']));
    container_ele.append(lower_ele);

    apply_event_listeners_to_comment(container_ele);

    return container_ele;
}

// DOM (Create): JobComment div with the comment itself inside
function create_comment_body(contents){
    let contents_ele = document.createElement('div');
    contents_ele.classList.add(CLASS_COMMENT_CONTENTS);
    let p = document.createElement('p');
    p.innerHTML = contents;
    contents_ele.append(p);

    return contents_ele;
}

// DOM (Create): JobComment div with the pinned and edit buttons inside
function create_comment_controls(is_pinned){
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

    let edit_btn = document.createElement('button');
    edit_btn.classList.add(CLASS_COMMENT_EDIT_BTN);
    edit_btn.innerHTML = 'edit';
    controls_ele.append(edit_btn);

    return controls_ele;
}

// DOM (Create): JobComment div with the user, timestamp and privacy status inside
function create_comment_ownership(username, timestamp, is_private){
    let result = document.createElement('div');
    result.innerHTML = `${username} on ${timestamp}`;

    // Placeholder: this bit will probably change when I CSS stuff
    let privacy_icon = get_comment_privacy_status_ele(is_private);
    result.append(privacy_icon);

    return result;
}

// DOM (Create): Apply event listeners to a comment's buttons. (Doing this separately so it can also be used by clones)
function apply_event_listeners_to_comment(comment_div){
    comment_div.querySelector('.' + CLASS_COMMENT_EDIT_BTN).addEventListener('click', (e) => {
        open_edit_job_comment(e.target);
    });

    comment_div.querySelector('.' + CLASS_COMMENT_PINNED_TOGGLE).addEventListener('click', (e) => {
        toggle_pinned_status(e.target);
    });
}



// --------------------------------------------------------------------------------------------
// DOM following JobComment Update
// --------------------------------------------------------------------------------------------
// DOM (Update): called by the handler function
function update_job_page_comments_after_update(response){
    // Remove the edit form
    close_create_job_comment_form_with_settings();

    // The user could've updated a status that affects where/how many times the comment appears on the page, so handle that next
    update_presence_in_filtered_comment_sections(response);

    // Update all remaining copies of this comment to reflect the changes the user just made
    document.querySelectorAll(`.${CLASS_PREFIX_FOR_COMMENT_ID}${response['id']}`).forEach(ele =>{
        update_comment_ele(response, ele);
    });
}

// DOM (Update): Loop through all "special" comment sections, ensuring the updated comment appears where it should.
function update_presence_in_filtered_comment_sections(response){
    let section_list = ['pinned', 'highlighted'];
    for(let i = 0; i < section_list.length; i++){
        update_presence_in_filtered_comment_section(response, section_list[i]);
    }
    return;
}

// DOM (Update/Delete): Check if the updated comment should appear in this one specific section and update accordingly.
function update_presence_in_filtered_comment_section(response, section_class_suffix){
    let container = document.querySelector('.' + CLASS_PREFIX_FOR_COMMENT_CONTAINER + section_class_suffix);
    let target_comment = container.querySelector(`.${CLASS_PREFIX_FOR_COMMENT_ID}${response['id']}`);

    let want_presence = response[section_class_suffix];
    let has_presence = target_comment != null;

    if(has_presence && !want_presence){
        target_comment.remove();
    }
    else if(!has_presence && want_presence){
        let new_comment_ele = get_new_comment_div(response);
        console.log(new_comment_ele);
        container.prepend(new_comment_ele);
    }
    return;
}


// DOM (Update): Dig into a standrad comment element and update everything.
function update_comment_ele(response, comment_container_ele){
    // Update comment_container_ele attributes according to response
    comment_container_ele.setAttribute('data-is_private', response['private']);
    comment_container_ele.setAttribute('data-is_pinned', response['pinned']);
    comment_container_ele.setAttribute('data-is_highlighted', response['highlighted']);

    // Update where the comment contents are displayed
    let contents_ele = comment_container_ele.querySelector('.' + CLASS_COMMENT_CONTENTS).querySelector('p');
    contents_ele.innerHTML = response['contents'];

    // Update where the pinned status is displayed (currently a button with a class toggle)
    let pinned_btn = comment_container_ele.querySelector('.' + CLASS_COMMENT_PINNED_TOGGLE);
    update_comment_pinned_btn(pinned_btn, response['pinned']);

    // Update where private/public status is displayed
    // Note: I'd prefer to only update the DOM if this /needs/ to change, but the placeholder version doesn't support that well.
    // If later on there ends up being a telling CSS class or something, add something smarter. :)
    let privacy_ele = comment_container_ele.querySelector('.' + CLASS_PRIVACY_STATUS);
    privacy_ele.before(get_comment_privacy_status_ele(response['private']));
    privacy_ele.remove();
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
function get_comment_privacy_status_ele(is_private){
    // PLACEHOLDER: this will probably change when the CSS is setup.
    let result = document.createElement('span');
    result.classList.add(CLASS_PRIVACY_STATUS);

    if(is_private){
        result.innerHTML = '[PRIVATE_ICON]';
    }
    else{
        result.innerHTML += '[public_icon]';
    }

    return result;
}




// --------------------------------------------------------------------------------------------
// DOM following JobComment Denied
// --------------------------------------------------------------------------------------------
// DOM Denied: called by handler function
function update_job_page_comments_after_denied(response_str, comment_container_ele){
    close_create_job_comment_form_with_settings();

    let contents_ele = comment_container_ele.querySelector('.contents');
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
// DOM following JobComment Delete
// --------------------------------------------------------------------------------------------
function update_job_page_comments_after_delete(comment_id){
    // Update all remaining copies of this comment to reflect the changes the user just made
    document.querySelectorAll(`.${CLASS_PREFIX_FOR_COMMENT_ID}${comment_id}`).forEach(ele =>{
        ele.remove();
    });
}



// --------------------------------------------------------------------------------------------
// JobComment Utils
// --------------------------------------------------------------------------------------------
// JobComment utils: remove any warnings
function remove_all_jobcomment_warnings(){
    document.querySelectorAll('.' + CLASS_ACCESS_DENIED).forEach(ele => {
        ele.remove();
    });
}

// JobComment utils: hide/show an element via a CSS class as required
function visibility_element(element, want_visibility){
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
// Pinned Toggle
// --------------------------------------------------------------------------------------------

function toggle_pinned_status(btn){
    let comment_container_div = btn.closest('.' + CLASS_INDIVIDUAL_COMMENT_CONTAINER);

    if(comment_container_div == null){
        return;
    }

    let previous_pinned = comment_container_div.dataset.is_pinned == 'true';
    let comment_id = comment_container_div.dataset.comment_id;

    update_pinned_on_server(comment_id, !previous_pinned);
    update_pinned_on_page(comment_container_div, !previous_pinned);
}

function update_pinned_on_server(comment_id, new_pinned_status){
    fetch(`${URL_PINNED_COMMENTS}?id=${comment_id}`, {
        method: 'POST',
        body: JSON.stringify({
            'task': 'toggle',
            'toggle_to': new_pinned_status
        }),
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
}

function update_pinned_on_page(comment_div, new_pinned_status){

    let class_to_find_comment = `${CLASS_PREFIX_FOR_COMMENT_ID}${comment_div.dataset.comment_id}`;

    // Find the copy of the comment in "all" and update the button and attributes
    let section_all = document.querySelector(`.${CLASS_ALL_COMMENTS_CONTAINER}`);
    let comment_in_all = section_all.querySelector(`.${class_to_find_comment}`);

    comment_in_all.setAttribute('data-is_pinned', new_pinned_status);
    let pinned_btn = comment_in_all.querySelector('.' + CLASS_COMMENT_PINNED_TOGGLE);
    update_comment_pinned_btn(pinned_btn, new_pinned_status);

    // Update the pinned section to either add or remove the comment
    let section_pinned = document.querySelector(`.${CLASS_PINNED_COMMENTS_CONTAINER}`);
    if(new_pinned_status){
        var comment_in_pinned = comment_in_all.cloneNode(true);
        apply_event_listeners_to_comment(comment_in_pinned);
        section_pinned.prepend(comment_in_pinned);

    } else {
        var comment_in_pinned = section_pinned.querySelector(`.${class_to_find_comment}`);
        comment_in_pinned.remove();
    }
}