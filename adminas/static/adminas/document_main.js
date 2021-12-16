/*
    Used on the read-only document page.
    Covers the functionality of the "replace with new version" and "revert to previous version" buttons.
*/

const ID_DOCUMENT_REPLACEMENT_BTN = 'replace_document_btn';
const ID_DOCUMENT_REVERT_BTN = 'revert_document_btn';

const CLASS_SPECIAL_INSTRUCTION_EDIT = 'edit-special-instruction-btn';
const CLASS_SPECIAL_INSTRUCTION_DELETE = 'delete-special-instruction-btn';
const CLASS_LOCAL_NAV = 'status-controls';

const CLASS_INSTRUCTIONS_SECTION = 'special-instructions';

const CLASS_SHOW_ADD_INSTRUCTION_FORMLIKE = 'special-instruction';
const CLASS_HIDE_ADD_INSTRUCTION_FORMLIKE = 'close-new-instr';

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {

    replace_btn = document.querySelector('#' + ID_DOCUMENT_REPLACEMENT_BTN);
    if(replace_btn != null){
        replace_btn.addEventListener('click', (e) => {
            next_or_previous_document_version(e.target, 'replace');
        });
    }

    revert_btn = document.querySelector('#' + ID_DOCUMENT_REVERT_BTN);
    if(revert_btn != null){

        revert_btn.addEventListener('click', (e) => {
            next_or_previous_document_version(e.target, 'revert');
        });

    }
});


// Adjust the version on the server and update the frontend
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
        // If the server responds with "redirect", go to the page.
        if ('redirect' in data){
            window.location.href = data['redirect'];
        // If the server responds with a "message", display it.
        } else if ('message' in data) {
            display_document_response_message(data, document.querySelector('.status-controls'));
        // If the server falls on its face, display a generic message.   
        } else {
            data = {}
            data['message'] = 'Something went wrong';
            display_document_response_message(data, document.querySelector('.status-controls'));
        }
    })
    .catch(error => {
        console.log('Error: ', error)
    })
}