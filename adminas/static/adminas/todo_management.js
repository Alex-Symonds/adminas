/*
    Adjust which Jobs appear on the user's to-do list.
*/

const CLASS_REMOVE_JOB_BTN = 'todo-list-remove';
const CLASS_ADD_JOB_BTN = 'todo-list-add';
const ID_PREFIX_JOB_PANEL = 'todo_panel_job_';
const CLASS_TODO_ERROR_MSG = 'todo-error-message';

const CLASS_TOGGLE_TODO_PRESENCE = 'todo-list-toggle';
const CLASS_STATUS_INDICATOR = 'status-indicator';

document.addEventListener('DOMContentLoaded', () => {

    // Index page has a (-) button on each panel, which removes the job from the to-do list
    document.querySelectorAll('.' + CLASS_REMOVE_JOB_BTN).forEach(btn => {
        btn.addEventListener('click', () => {
            remove_from_todo_list(btn);
        });
    });

    // Records page has a [+] button for each <tr> not on the to-do list, which adds that job to the to-do list
    document.querySelectorAll('.' + CLASS_ADD_JOB_BTN).forEach(btn => {
        btn.addEventListener('click', () => {
            add_to_todo_list(btn);
        });
    });

    // Job page has a status indicator which shows "on" or "off": user clicks on/off to toggle
    document.querySelectorAll('.' + CLASS_TOGGLE_TODO_PRESENCE).forEach(btn => {
        btn.addEventListener('click', () => {
            toggle_todo_list(btn);
        })
    })
});




// Toggle: main function called by clicking on/off
function toggle_todo_list(btn){
    if(btn.dataset.on_todo_list === 'true'){
        remove_from_todo_list(btn);
    }
    else {
        add_to_todo_list(btn);
    }
}






// Remove from To-Do List: backend, then conditional frontend response
function remove_from_todo_list(btn){
    fetch(`${URL_TODO_MANAGEMENT}`, {
        method: 'DELETE',
        body: JSON.stringify({
            'job_id': btn.dataset.job_id
        }),
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        clear_todo_error_from_job_panels();
        if('message' in data){
            if(!display_todo_error_on_job_panel(data['message'])){
                alert(message);
            }
        } else if('id' in data){
            update_frontend_after_removal(btn, data);
        }
    })
    .catch(error => {
        console.log('Error: ', error);
    })
}

// Add to To-Do List: backend, then conditional frontend response
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
            update_frontend_after_add(btn);
        }
    })
    .catch(error => {
        console.log('Error: ', error);
    })
}





// Remove: main function called by the fetch block to conditionally handle frontend updates
function update_frontend_after_removal(btn, data){
    // If request came from an on/off toggle, run the function to change on to off
    if(btn.classList.contains(CLASS_TOGGLE_TODO_PRESENCE)){
        update_todo_indicator_with_toggle(btn, false);
    }
    // If request came from a close panel button, run the function to remove the panel
    else if(btn.classList.contains(CLASS_REMOVE_JOB_BTN)){
        remove_job_panel_from_todo_list(data['id']);
    }  
}


// Add: main function called by the fetch block to conditionally handle frontend updates
function update_frontend_after_add(btn){
    // If request came from an on/off toggle, run the function to change off to on
    if(btn.classList.contains(CLASS_TOGGLE_TODO_PRESENCE)){
        update_todo_indicator_with_toggle(btn, true);
    }
    else if(btn.classList.contains(CLASS_ADD_JOB_BTN)){
        replace_todo_add_btn_with_on(btn);
    } 
}







// Remove via Job panel: attempt to display an error message inside a Job panel and report if it worked
function display_todo_error_on_job_panel(message){
    active_ele = document.querySelector(`#${ID_PREFIX_JOB_PANEL}${job_id}`);
    if(active_ele != null){
        msg_ele = document.createElement('div');
        msg_ele.classList.add(CLASS_TODO_ERROR_MSG);
        msg_ele.innerHTML = message;
    
        active_ele.prepend(msg_ele);
        return true;
    }
    return false;
}

// Remove via Job panel: get rid of the error messages so they don't stay there for ever
function clear_todo_error_from_job_panels(){
    document.querySelectorAll('.' + CLASS_TODO_ERROR_MSG).forEach(ele => {
        ele.remove();
    });
}

// Remove via Job panel: get rid of a Job panel element from the todo list / index page
function remove_job_panel_from_todo_list(job_id){
    ele_to_remove = document.querySelector(`#${ID_PREFIX_JOB_PANEL}${job_id}`);
    if(ele_to_remove != null){
        ele_to_remove.remove();
    }
}







// Add via [+] button: replace the button with a span saying "on"
function replace_todo_add_btn_with_on(btn){
    let span = document.createElement('span');
    span.classList.add(CLASS_ADD_JOB_BTN);
    span.innerHTML = 'on';
    btn.before(span);
    btn.remove();
}








// Toggle via Indicator: use the button to find the indicator ele, then update both
function update_todo_indicator_with_toggle(btn, is_on_todo_list){   
    let indicator_ele = btn.closest(`.${CLASS_STATUS_INDICATOR}`);
    update_todo_toggle_btn(btn, is_on_todo_list);
    update_todo_toggle_status_ele(indicator_ele, is_on_todo_list);
    return;
}

// Toggle via Indicator: update the button
function update_todo_toggle_btn(btn, is_on){
    if(btn !== null){
        let display_str = 'off';
        if(is_on){
            display_str = 'on';
        }

        btn.innerHTML = display_str;
        if(btn.hasAttribute('data-on_todo_list')){
            btn.setAttribute('data-on_todo_list', is_on.toString());
        } 
    }  
}

// Toggle via Indicator: update the indicator
function update_todo_toggle_status_ele(indicator_ele, is_on){
    if(indicator_ele !== null){
        const on_class = 'on';
        const off_class = 'off';

        let wanted_class = off_class;
        let unwanted_class = on_class;
        if(is_on){
            wanted_class = on_class;
            unwanted_class = off_class;
        }

        if(indicator_ele.classList.contains(unwanted_class)){
            indicator_ele.classList.remove(unwanted_class);
        }

        if(!indicator_ele.classList.contains(wanted_class)){
            indicator_ele.classList.add(wanted_class);
        }
    }
    return;      
}
