const ID_ADD_COMMENT_BTN = 'id_add_job_comment';
const DEFAULT_COMMENT_ID = '0';


document.addEventListener('DOMContentLoaded', () => {

    document.getElementById(ID_ADD_COMMENT_BTN).addEventListener('click', ()=>{
        open_create_job_comment_form(DEFAULT_COMMENT_ID);
    });

});


function open_create_job_comment_form(comment_id){
    let job_comment_form = create_job_comment_form(comment_id);
    let add_btn = document.getElementById(ID_ADD_COMMENT_BTN);

    add_btn.after(job_comment_form);
    add_btn.classList.add('hide');
}


function create_job_comment_form(comment_id){
    let container = document.createElement('div');
    container.classList.add('job-comment-cu-container');

    let h = document.createElement('h4');
    if(comment_id == DEFAULT_COMMENT_ID){
        h.innerHTML = 'Add Comment';
    } else {
        h.innerHTML = 'Edit Comment';
    }
    container.append(h);

    let main_input = document.createElement('textarea');
    main_input.name = 'contents';
    main_input.id = 'id_comment_contents'
    main_input.cols = 30;
    main_input.rows = 5;
    container.append(main_input);

    let private_label = document.createElement('label');
    private_label.innerHTML = 'Private';
    private_label.for = 'id_private_checkbox';
    container.append(private_label);

    let private_checkbox = document.createElement('input');
    private_checkbox.type = 'checkbox';
    private_checkbox.id = 'id_private_checkbox';
    private_checkbox.checked = true;
    private_checkbox.name = 'private_checkbox';
    container.append(private_checkbox);

    let todo_label = document.createElement('label');
    todo_label.innerHTML = 'To-do list';
    todo_label.for = 'id_todo_checkbox';
    container.append(todo_label);

    let todo_checkbox = document.createElement('input');
    todo_checkbox.type = 'checkbox';
    todo_checkbox.id = 'id_todo_checkbox';
    todo_checkbox.name = 'todo_checkbox';
    container.append(todo_checkbox);

    let save_btn = document.createElement('button');
    save_btn.innerHTML = 'save';
    save_btn.addEventListener('click', (e) => {
        save_job_comment(e.target);
    });
    save_btn.setAttribute('data-comment_id', comment_id);
    container.append(save_btn);
    
    return container;
}




function save_job_comment(btn){
    let contents = document.getElementById('id_comment_contents').value;
    let want_private = document.getElementById('id_private_checkbox').value;
    let want_todo = document.getElementById('id_todo_checkbox').value;

    fetch(`${URL_JOB_COMMENTS}?id=${btn.dataset.comment_id}`, {
        method: 'POST',
        body: JSON.stringify({
            'contents': contents,
            'private': want_private == 'on',
            'todo_bool': want_todo == 'on'
        }),
        'headers': getDjangoCsrfHeaders(),
        'credentials': 'include'
    });

}