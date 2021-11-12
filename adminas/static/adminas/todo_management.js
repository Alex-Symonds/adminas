const CLASS_REMOVE_JOB_BTN = 'todo-list-remove';
const CLASS_ADD_JOB_BTN = 'todo-list-add';
const ID_PREFIX_JOB_PANEL = 'todo_panel_job_';
const CLASS_TODO_ERROR_MSG = 'todo-error-message';

const CLASS_TOGGLE_TODO_PRESENCE = 'toggle-todolist';
const CLASS_STATUS_INDICATOR = 'status-indicator';

document.addEventListener('DOMContentLoaded', () => {

    document.querySelectorAll('.' + CLASS_REMOVE_JOB_BTN).forEach(btn => {
        btn.addEventListener('click', () => {
            remove_from_todo_list(btn);
        });
    });

    document.querySelectorAll('.' + CLASS_ADD_JOB_BTN).forEach(btn => {
        btn.addEventListener('click', () => {
            add_to_todo_list(btn);
        });
    });

    document.querySelectorAll('.' + CLASS_TOGGLE_TODO_PRESENCE).forEach(btn => {
        btn.addEventListener('click', () => {
            toggle_todo_list(btn);
        })
    })
});


function toggle_todo_list(btn){
    if(btn.dataset.on_todo_list === 'true'){
        remove_from_todo_list(btn);
    }
    else {
        add_to_todo_list(btn);
    }
}


function remove_from_todo_list(btn){
    fetch(`${URL_TODO_MANAGEMENT}`, {
        method: 'POST',
        body: JSON.stringify({
            'job_id': btn.dataset.job_id,
            'task': 'remove'
        }),
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        clear_todo_error_messages();
        if('message' in data){
            display_error_on_todo_list(data['message']);
        } else if('id' in data){
            frontend_update_todo_toggle_btn(btn, false);
            remove_panel_from_todo_list(data['id']);
        }
    })
    .catch(error => {
        console.log('Error: ', error);
    })
}

function add_to_todo_list(btn){
    fetch(`${URL_TODO_MANAGEMENT}`, {
        method: 'POST',
        body: JSON.stringify({
            'job_id': btn.dataset.job_id,
            'task': 'add'
        }),
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if('message' in data){
            alert(data['message']);
        } else {
            frontend_update_todo_toggle_btn(btn, true);
            replace_todo_btn(btn);
        }
    })
    .catch(error => {
        console.log('Error: ', error);
    })
}

function display_error_on_todo_list(message){
    active_ele = document.querySelector(`#${ID_PREFIX_JOB_PANEL}${job_id}`);

    msg_ele = document.createElement('div');
    msg_ele.classList.add(CLASS_TODO_ERROR_MSG);
    msg_ele.innerHTML = message;

    active_ele.prepend(msg_ele);
}

function clear_todo_error_messages(){
    document.querySelectorAll('.' + CLASS_TODO_ERROR_MSG).forEach(ele => {
        ele.remove();
    });
}

function remove_panel_from_todo_list(job_id){
    ele_to_remove = document.querySelector(`#${ID_PREFIX_JOB_PANEL}${job_id}`);
    if(ele_to_remove != null){
        ele_to_remove.remove();
    }
}

function replace_todo_btn(btn){
    if(REPLACE_TODO_BTN == 'td-dash'){
        td = btn.parentElement;
        btn.remove();
        td.innerHTML = '-';
    }
    // else if(REPLACE_TODO_BTN == 'div'){
    //     div = document.createElement('div');
    //     div.classList.add('on-todo-list');
    //     div.innerHTML = 'on todo list';
    //     btn.before(div);
    //     btn.remove();
    // }
}

function frontend_update_todo_toggle_btn(btn, is_on_todo_list){
    if(!btn.classList.contains(CLASS_TOGGLE_TODO_PRESENCE)){
        return;
    }

    if(btn.hasAttribute('data-on_todo_list')){
        btn.setAttribute('data-on_todo_list', is_on_todo_list.toString());
    }
    
    let indicator_ele = btn.closest(`.${CLASS_STATUS_INDICATOR}`);
    status_indicator_on_off_update(is_on_todo_list, btn, indicator_ele);
    return;
}


function status_indicator_on_off_update(is_on, btn, indicator_ele){
    let on_class = 'on';
    let off_class = 'off';

    if(is_on && btn !== null){
        btn.innerHTML = 'on';

        var wanted_class = on_class;
        var unwanted_class = off_class;
    }
    else if(btn !== null){
        btn.innerHTML = 'off';

        var wanted_class = off_class;
        var unwanted_class = on_class;
    }

    if(indicator_ele !== null){
        if(indicator_ele.classList.contains(unwanted_class)){
            indicator_ele.classList.remove(unwanted_class);
        }

        if(!indicator_ele.classList.contains(wanted_class)){
            indicator_ele.classList.add(wanted_class);
        }
    }
    return;   
}