import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://snnwuxycqgxpolucutnt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnd1eHljcWd4cG9sdWN1dG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MzYyNjQsImV4cCI6MjA2NzIxMjI2NH0.vQyRzB4-y8IJQN9AfiCPfqAFP0glxXcjfLcNG1ilimg'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const loginTab = document.getElementById('login-tab')
const signupTab = document.getElementById('signup-tab')

loginTab.addEventListener('click', () => {
    loginTab.classList.add('active')
    signupTab.classList.remove('active')
    loginForm.style.display = 'block'
    signupForm.style.display = 'none'
})

signupTab.addEventListener('click', () => {
    signupTab.classList.add('active')
    loginTab.classList.remove('active')
    loginForm.style.display = 'none'
    signupForm.style.display = 'block'
})

const loginForm = document.getElementById('login-form')
const signupForm = document.getElementById('signup-form')
const logoutBtn = document.getElementById('logout-btn')
const uploadSection = document.getElementById('upload-section')
const fileInput = document.getElementById('file-input')
const uploadBtn = document.getElementById('upload-btn')
const gallery = document.getElementById('gallery')
const preview = document.getElementById('preview')
const notification = document.getElementById('notification')

function showNotification(msg, color='black') {
    notification.textContent = msg
    notification.style.display = 'block'
    notification.style.background = color
    setTimeout(() => notification.style.display = 'none', 3000)
}

async function loadGallery() {
    gallery.innerHTML = 'Загрузка...'
    const { data: { session } } = await supabase.auth.getSession()
    const { data, error } = await supabase.storage.from('media').list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
    })
    if (error) {
        gallery.innerHTML = 'Ошибка загрузки: ' + error.message
        return
    }
    if (!data || data.length === 0) {
        gallery.innerHTML = '<p>Нет файлов</p>'
        return
    }
    gallery.innerHTML = ''
    for (const item of data) {
        const { publicURL } = supabase.storage.from('media').getPublicUrl(item.name)
        let el
        if (item.name.match(/\.(mp4|webm|ogg)$/i)) {
            el = document.createElement('video')
            el.src = publicURL
            el.controls = true
        } else if (item.name.match(/\.(jpg|jpeg|png|gif)$/i)) {
            el = document.createElement('img')
            el.src = publicURL
            el.alt = item.name
        } else {
            continue
        }
        if (session) {
            const wrapper = document.createElement('div')
            wrapper.appendChild(el)
            const delBtn = document.createElement('button')
            delBtn.textContent = 'Удалить'
            delBtn.className = 'delete-btn'
            delBtn.addEventListener('click', async () => {
                if (confirm('Удалить файл?')) {
                    const { error: delError } = await supabase.storage.from('media').remove([item.name])
                    if (delError) {
                        showNotification('Ошибка удаления: ' + delError.message, 'darkred')
                    } else {
                        showNotification('Файл удалён', 'green')
                        await loadGallery()
                    }
                }
            })
            wrapper.appendChild(delBtn)
            gallery.appendChild(wrapper)
        } else {
            gallery.appendChild(el)
        }
    }
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('login-email').value
    const password = document.getElementById('login-password').value
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
        showNotification('Ошибка входа: ' + error.message, 'darkred')
    } else {
        showNotification('Вход выполнен', 'green')
        loginForm.style.display = 'none'
        signupForm.style.display = 'none'
        logoutBtn.style.display = 'block'
        uploadSection.style.display = 'block'
        await loadGallery()
    }
})

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('signup-email').value
    const password = document.getElementById('signup-password').value
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
        showNotification('Ошибка регистрации: ' + error.message, 'darkred')
    } else {
        showNotification('Регистрация выполнена. Проверьте почту для подтверждения.', 'green')
    }
})

logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut()
    showNotification('Вы вышли')
    loginForm.style.display = 'block'
    signupForm.style.display = 'block'
    logoutBtn.style.display = 'none'
    uploadSection.style.display = 'none'
    await loadGallery()
})

fileInput.addEventListener('change', () => {
    preview.innerHTML = ''
    const file = fileInput.files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    let el
    if (file.type.startsWith('video/')) {
        el = document.createElement('video')
        el.src = url
        el.controls = true
    } else if (file.type.startsWith('image/')) {
        el = document.createElement('img')
        el.src = url
    }
    preview.appendChild(el)
})

uploadBtn.addEventListener('click', async () => {
    const file = fileInput.files[0]
    if (!file) {
        showNotification('Выберите файл')
        return
    }
    const { error } = await supabase.storage.from('media').upload(file.name, file, { upsert: true })
    if (error) {
        showNotification('Ошибка загрузки: ' + error.message, 'darkred')
    } else {
        showNotification('Файл загружен', 'green')
        fileInput.value = ''
        preview.innerHTML = ''
        await loadGallery()
    }
})

supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        loginForm.style.display = 'none'
        signupForm.style.display = 'none'
        logoutBtn.style.display = 'block'
        uploadSection.style.display = 'block'
    }
    loadGallery()
})