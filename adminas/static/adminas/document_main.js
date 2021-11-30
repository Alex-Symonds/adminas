const ID_DOCUMENT_REPLACEMENT_BTN = 'replace_document_btn';
const ID_DOCUMENT_REVERT_BTN = 'revert_document_btn';

document.addEventListener('DOMContentLoaded', () => {

    replace_btn = document.querySelector('#' + CLASS_DOCUMENT_REPLACEMENT_BTN);
    if(replace_btn != null){
        replace_btn.addEventListener('click', (e) => {
            next_or_previous_document_version(e.target, 'replace');
        });
    }


    revert_btn = document.querySelector('#' + CLASS_DOCUMENT_REVERT_BTN);
    if(revert_btn != null){

        revert_btn.addEventListener('click', (e) => {
            next_or_previous_document_version(e.target, 'revert');
        });

    }
});



function next_or_previous_document_version(btn, taskname){
    fetch(`${URL_DOC_MAIN}`, {
        method: 'POST',
        body: JSON.stringify({
            'task': taskname
        }),
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if ('redirect' in data){
            window.location.href = data['redirect'];
        } else if ('message' in data) {
            display_document_response_message(data, btn);
        } else {
            data = {}
            data['message'] = 'Something went wrong';
            display_document_response_message(data, btn);
        }
    })
    .catch(error => {
        console.log('Error: ', error)
    })
}
