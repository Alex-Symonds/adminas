const ID_ADD_COMMENT_WITH_SETTINGS_BTN = 'id_add_job_comment_with_settings';
const DEFAULT_COMMENT_ID = '0';
const CLASS_COMMENT_EDIT_BTN = 'edit-comment';
const CLASS_COMMENT_DELETE_BTN = 'delete-comment-btn';

const CLASS_COMMENT_CU_ELEMENT = 'job-comment-cu-container';
const ID_COMMENT_TEXTAREA = 'id_comment_contents';
const ID_COMMENT_CHECKBOX_PRIVATE = 'id_private_checkbox';
const ID_COMMENT_CHECKBOX_TODO = 'id_todo_checkbox';

const CLASS_INDIVIDUAL_COMMENT_CONTAINER = 'one-comment';
const CLASS_COMMENT_MAIN = 'main';
const CLASS_COMMENT_CONTENTS = 'contents';
const CLASS_COMMENT_CONTROLS = 'controls';
const CLASS_COMMENT_FOOTER = 'footer';

document.addEventListener('DOMContentLoaded', () => {

    document.getElementById(ID_ADD_COMMENT_WITH_SETTINGS_BTN).addEventListener('click', ()=>{
        open_create_job_comment_form_with_settings(DEFAULT_COMMENT_ID);
    });

    document.querySelectorAll('.' + CLASS_COMMENT_EDIT_BTN).forEach(btn => {
        btn.addEventListener('click', (e) => {
            open_edit_job_comment(e.target);
        })
    });

});


function open_create_job_comment_form_with_settings(comment_id){
    let job_comment_form = create_job_comment_form_with_settings(comment_id);
    let anchor_ele = document.getElementById(ID_ADD_COMMENT_WITH_SETTINGS_BTN);
    anchor_ele.after(job_comment_form);
    visibility_add_comment_btn(false);
}

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

    let todo_label = document.createElement('label');
    todo_label.innerHTML = 'To-do list';
    todo_label.for = ID_COMMENT_CHECKBOX_TODO;
    container.append(todo_label);

    let todo_checkbox = document.createElement('input');
    todo_checkbox.type = 'checkbox';
    todo_checkbox.id = ID_COMMENT_CHECKBOX_TODO;
    container.append(todo_checkbox);

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

function close_create_job_comment_form_with_settings(){
    let ele = document.querySelector('.' + CLASS_COMMENT_CU_ELEMENT);
    let comment_ele = ele.closest('.' + CLASS_INDIVIDUAL_COMMENT_CONTAINER);

    if(ele != null){
        ele.remove();
    }

    if(comment_ele != null){
        visibility_edit_mode(comment_ele, true);
    }

    visibility_add_comment_btn(true);
}


function visibility_add_comment_btn(want_visibility){
    visibility_element(document.getElementById(ID_ADD_COMMENT_WITH_SETTINGS_BTN), want_visibility);
}


async function save_job_comment_with_settings(btn){
    let response = await save_job_comment(btn);
    update_job_page_comments_post_create(response);
}

async function save_job_comment(btn){
    // This function will be called in two situations:
    //  1) From the Job page, where there are checkboxes to flag a comment for privacy and todo list visibility
    //  2) From the to-do list, where it's a more compact display and has no checkboxes.
    // If there's a checkbox, use the value the user has set; if not, default to true for both.
    // This default is based on the assumptions that: adding a comment from the todo list implies the user wants it displayed on the todo list;
    // todo list comments are intended to serve as reminders for the user, so many may not be of public interest anyway;
    // private = true is a safer default than the alternative.

    let contents = document.getElementById('id_comment_contents').value;

    let want_private = true;
    let private_checkbox = document.getElementById('id_private_checkbox');
    if(private_checkbox != null){
        want_private = private_checkbox.checked;
    }

    let want_todo = true;
    let todo_checkbox = document.getElementById('id_todo_checkbox')
    if(todo_checkbox != null){
        want_todo = todo_checkbox.checked;
    }

    let response = await fetch(`${URL_JOB_COMMENTS}?id=${btn.dataset.comment_id}`, {
        method: 'POST',
        body: JSON.stringify({
            'contents': contents,
            'private': want_private,
            'todo_bool': want_todo
        }),
        'headers': getDjangoCsrfHeaders(),
        'credentials': 'include'
    })
    .catch(error => {
        console.log('Error: ', error);
    });

    return await response.json();
}


function update_job_page_comments_post_create(response){   
    close_create_job_comment_form_with_settings();
    let new_comment_div = get_new_comment_div_full(response);
    let anchor_ele = document.getElementById(ID_ADD_COMMENT_WITH_SETTINGS_BTN);
    anchor_ele.before(new_comment_div);
}


function get_new_comment_div_full(response){
    let container_ele = document.createElement('div');
    container_ele.classList.add(CLASS_INDIVIDUAL_COMMENT_CONTAINER);
    container_ele.setAttribute('data-comment_id', response['id']);
    container_ele.setAttribute('data-is_private', response['private']);
    container_ele.setAttribute('data-on_todo', response['todo']);

    let upper_ele = document.createElement('div');
    upper_ele.classList.add(CLASS_COMMENT_MAIN);
    upper_ele.append(create_comment_body(response['contents']));
    upper_ele.append(create_comment_controls(response['todo']));

    container_ele.append(upper_ele);

    let lower_ele = document.createElement('div');
    lower_ele.classList.add(CLASS_COMMENT_FOOTER);
    lower_ele.append(create_comment_ownership(response['username'], response['timestamp'], response['private']));
    container_ele.append(lower_ele);

    return container_ele;
}

function create_comment_body(contents){
    let contents_ele = document.createElement('div');
    contents_ele.classList.add(CLASS_COMMENT_CONTENTS);
    let p = document.createElement('p');
    p.innerHTML = contents;
    contents_ele.append(p);

    return contents_ele;
}

function create_comment_controls(is_on_todo_list){
    let controls_ele = document.createElement('div');
    controls_ele.classList.add(CLASS_COMMENT_CONTROLS);
    let todo_btn = document.createElement('button');
    todo_btn.classList.add('todo-list-toggle');

    if(is_on_todo_list){
        todo_btn.classList.add('todo-status-on');
    } else {
        todo_btn.classList.add('todo-status-off');
    }

    todo_btn.innerHTML = 'todo';
    // TODO: event listener for todo goes here, when I have a function for it
    controls_ele.append(todo_btn);

    let edit_btn = document.createElement('button');
    edit_btn.classList.add(CLASS_COMMENT_EDIT_BTN);
    edit_btn.innerHTML = 'edit';
    edit_btn.addEventListener('click', (e) => {
        open_edit_job_comment(e.target);
    });
    controls_ele.append(edit_btn); 

    return controls_ele;
}

function create_comment_ownership(username, timestamp, is_private){
    let ownership_str = `${username} on ${timestamp}`;

    // Placeholder: this bit will probably change when I CSS stuff
    if(is_private){
        ownership_str += ' [PRIVATE_ICON]';
    }
    else{
        ownership_str += ' [public_icon]';
    }

    return document.createTextNode(ownership_str);
}




/// -------------------------------------------------------- update and delete start here
function open_edit_job_comment(btn){
    let comment_container = btn.closest('.' + CLASS_INDIVIDUAL_COMMENT_CONTAINER);
    let edit_mode_ele = edit_job_comment_form_with_settings(comment_container);
    comment_container.prepend(edit_mode_ele);
    visibility_edit_mode(comment_container, false);
}

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

    // Todo status default == false
    let old_todo_status = comment_container.dataset.on_todo;
    if(old_todo_status.toLowerCase() == 'true'){
        base_element.querySelector('#' + ID_COMMENT_CHECKBOX_TODO).checked = true;
    }

    return base_element;
}


function visibility_edit_mode(comment_ele, want_visibility){
    visibility_element(comment_ele.querySelector('.' + CLASS_COMMENT_MAIN), want_visibility);
    visibility_element(comment_ele.querySelector('.' + CLASS_COMMENT_FOOTER), want_visibility);
    return;
}

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





async function delete_job_comment(btn){
    console.log('delete button was clicked, omg!');
    // let response = await delete_job_comment(btn.dataset.comment_id);
    // update_job_page_comments_post_delete(btn);
}


