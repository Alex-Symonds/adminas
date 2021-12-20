document.addEventListener('DOMContentLoaded', () => {
    let delete_btn = document.getElementById('delete_job_btn');
    if(delete_btn != null){
        delete_btn.addEventListener('click', () => {
            delete_job();
        });
    }
});



function delete_job(){
    fetch(URL_DELETE_JOB, {
        method: 'POST',
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .then(() => {
        window.location.href = '/';
    }
    )
    .catch(error => {
        console.log('Error: ', error)
    });
}