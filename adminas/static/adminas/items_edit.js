document.addEventListener('DOMContentLoaded', function(e) {
    document.querySelectorAll('.ji-edit').forEach(btn => {
        btn.addEventListener('click', function(e){
            edit_mode_job_item(e);
        });
    });
});

const JOB_ITEM_FIELDS = ['quantity', 'product', 'selling_price','price_list'];

const EDIT_PREFIX = 'edit-item-';

function update_job_item(e){
    e.preventDefault();

    div = e.target.closest('.job-item-container');
    let prefix = '#id_' + EDIT_PREFIX.replaceAll('-', '_');

/*
    // Prepare for CSRF authentication
    var csrftoken = getCookie('csrftoken');
    var headers = new Headers();
    headers.append('X-CSRFToken', csrftoken);

    // PUT it into the database and call function to handle the page
    
    fetch('/items', {
        method: 'PUT',
        body: JSON.stringify({
            'id': e.target.dataset.jiid,
            'quantity': div.querySelector(prefix + 'qty').value.trim(),
            'product': div.querySelector(prefix + 'product').value.trim(),
            'selling_price': div.querySelector(prefix + 'selling_price').value.trim(),
            'price_list': div.querySelector(prefix + 'price_list').value.trim()
        }),
        headers: headers,
        credentials: 'include'
    })
    .then(response => {
        undo_edit_form(div);
    })
    .catch(error =>{
        console.log('Error: ', error);
    });*/
    undo_edit_form(div);
}

function undo_edit_form(div){
    for(let i = 0; i < JOB_ITEM_FIELDS.length; i++){
        input_to_span(div, EDIT_PREFIX, JOB_ITEM_FIELDS[i]);
    }

    // Move currency back to before the value field
    div.querySelector('.selling-price').before(div.querySelector('.currency'));

    edit_btn = document.querySelector('#id_btn_edit_item').remove();

    document.querySelectorAll('.ji-edit').forEach(btn => {
        btn.classList.remove('hide');
    });
}


function edit_mode_job_item(e){
    e.preventDefault();

    item_div = e.target.closest('.job-item-container');

    span_to_form_row(item_div);
    /*for(let i = 0; i < JOB_ITEM_FIELDS.length; i++){
        span_to_input(item_div, EDIT_PREFIX, JOB_ITEM_FIELDS[i]);
    }*/

    // Add submit button
    submit_btn = document.createElement('button');
    submit_btn.innerHTML = 'submit';
    submit_btn.id = 'id_btn_edit_item';
    submit_btn.dataset.jiid = e.target.dataset.jiid;
    submit_btn.addEventListener('click', function(e) {
        update_job_item(e);
    });
    e.target.after(submit_btn);

    // Move currency to after the value field
    //document.querySelector('#id_' + EDIT_PREFIX.replaceAll('-', '_') + 'selling_price').after(item_div.querySelector('.currency'));

    // Hide all the other edit buttons, so only one item can be added at a time
    document.querySelectorAll('.ji-edit').forEach(btn => {
        btn.classList.add('hide');
    });
}

function span_to_input(div, prefix, name){
    let span = div.querySelector('.' + name);
    
    let label = document.createElement('label');
    label.id = 'id_label_' + (prefix + name).replaceAll('-', '_');
    label.innerHTML = name.replaceAll('-', ' ');

    let field = document.createElement('input');
    field.id = 'id_' + (prefix + name).replaceAll('-', '_');
    field.class = prefix + name;
    field.value = span.innerHTML;

    span.after(label);
    label.after(field);
    span.remove();
}

function span_to_form_row(div){
    let new_item = document.createElement('div');
    const DEL_TOKEN = '0-';
    const PREFIX = 'form';

    for(let i=0; i < JOB_ITEM_FIELDS.length; i++){
        var original = document.querySelector(`#id_form-0-${JOB_ITEM_FIELDS[i]}`);

        var field = original.cloneNode(true);
        console.log(field);
        field.id = field.id.replace(DEL_TOKEN, '');
        field.name = field.name.replace(DEL_TOKEN, '');

        var span_value = div.querySelector('.' + JOB_ITEM_FIELDS[i]).innerHTML;
        console.log(JOB_ITEM_FIELDS[i] + ' value = ' + span_value);

        if (field.tagName === 'INPUT'){
            if(field.type === 'number' && field.step === 0.01){
                var num_value = parseFloat(span_value.replaceAll(',', ''));
                field.value = num_value;

            } else if (field.type === 'number'){
                var num_value = parseInt(span_value.replaceAll(',', ''));
                field.value = num_value;   

            } else {
                field.value = span_value;
            }

        } if (field.tagName === 'SELECT'){
            for(let s = 0; s < field.options.length; s++){
                if(field.options[s].text === span_value){
                    field.selectedIndex = s;
                    break;
                }
            }
        } 
        
        var label = original.previousElementSibling;
        label.htmlFor = label.htmlFor.replace(DEL_TOKEN, '');
        
        new_item.append(label);
        new_item.append(field);
    }
    
    item_div.append(new_item);
}




function input_to_span(div, prefix, name){
    field = div.querySelector('#id_' + (prefix + name).replaceAll('-', '_'));
    label = div.querySelector('#id_label_' + (prefix + name).replaceAll('-', '_'));

    span = document.createElement('span');
    span.classList.add(name);
    span.innerHTML = field.value;
    field.after(span);
    field.remove();
    label.remove();
}


// GENERAL USE ----------------------------------------------------------------
function getCookie(name) {
    // Gets a cookie.
    // Taken from Django documentation for CSRF handling
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}