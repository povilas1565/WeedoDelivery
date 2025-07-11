﻿import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://snnwuxycqgxpolucutnt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnd1eHljcWd4cG9sdWN1dG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MzYyNjQsImV4cCI6MjA2NzIxMjI2NH0.vQyRzB4-y8IJQN9AfiCPfqAFP0glxXcjfLcNG1ilimg'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const loginForm = document.getElementById('login-form')
const emailInput = document.getElementById('email')
const passwordInput = document.getElementById('password')
const authMessage = document.getElementById('auth-message')

const uploadSection = document.getElementById('upload-section')
const fileInput = document.getElementById('file-input')
const uploadBtn = document.getElementById('upload-btn')
const uploadMessage = document.getElementById('upload-message')
const logoutBtn = document.getElementById('logout-btn')

const authSection = document.getElementById('auth-section')
const gallery = document.getElementById('gallery')

let currentUser = null

// Проверяем сессию при загрузке
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    console.log('session при загрузке:', session)

    if (session && session.user) {
        currentUser = session.user
        authSection.style.display = 'none'
        uploadSection.style.display = 'block'
    } else {
        currentUser = null
        authSection.style.display = 'block'
        uploadSection.style.display = 'none'
    }
}

// Слушаем смену сессии
supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Смена состояния авторизации:', event, session)
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        currentUser = session?.user ?? null
        authSection.style.display = 'none'
        uploadSection.style.display = 'block'
    } else {
        currentUser = null
        authSection.style.display = 'block'
        uploadSection.style.display = 'none'
    }
    await loadGallery()
})

// Авторизация
loginForm.addEventListener('submit', async e => {
    e.preventDefault()
    authMessage.style.color = 'red'
    authMessage.textContent = ''

    const email = emailInput.value
    const password = passwordInput.value

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    })

    if (error) {
        authMessage.textContent = 'Ошибка входа: ' + error.message
    } else {
        authMessage.style.color = 'green'
        authMessage.textContent = 'Вход успешен!'
        // больше не вызываем checkAuth() здесь
        // теперь всё сработает через onAuthStateChange
    }
})

// Выход
logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut()
    // больше не вызываем checkAuth() здесь
})

// Загрузка файла
uploadBtn.addEventListener('click', async () => {
    uploadMessage.style.color = 'red'
    uploadMessage.textContent = ''
    const file = fileInput.files[0]
    if (!file) {
        uploadMessage.textContent = 'Пожалуйста, выберите файл'
        return
    }

    const filePath = `${Date.now()}_${file.name}`

    const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file)

    if (uploadError) {
        uploadMessage.textContent = 'Ошибка загрузки: ' + uploadError.message
    } else {
        uploadMessage.style.color = 'green'
        uploadMessage.textContent = 'Файл успешно загружен!'
        fileInput.value = ''
        await loadGallery()
    }
})

// Загрузка галереи
async function loadGallery() {
    gallery.innerHTML = 'Загрузка...'
    const { data, error } = await supabase.storage.from('media').list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
    })

    if (error) {
        gallery.innerHTML = 'Ошибка загрузки галереи: ' + error.message
        return
    }

    if (!data || data.length === 0) {
        gallery.innerHTML = '<p>Нет файлов</p>'
        return
    }

    gallery.innerHTML = ''

    for (const item of data) {
        const publicUrl = supabase.storage.from('media').getPublicUrl(item.name).publicURL

        const container = document.createElement('div')
        container.className = 'media-item'

        let mediaElem
        if (item.name.match(/\.(mp4|webm|ogg)$/i)) {
            mediaElem = document.createElement('video')
            mediaElem.src = publicUrl
            mediaElem.controls = true
        } else if (item.name.match(/\.(jpg|jpeg|png|gif|bmp)$/i)) {
            mediaElem = document.createElement('img')
            mediaElem.src = publicUrl
            mediaElem.alt = item.name
        } else {
            continue
        }

        container.appendChild(mediaElem)

        if (currentUser) {
            const deleteBtn = document.createElement('button')
            deleteBtn.textContent = 'Удалить'
            deleteBtn.addEventListener('click', async () => {
                if (confirm(`Удалить файл ${item.name}?`)) {
                    const { error: deleteError } = await supabase.storage.from('media').remove([item.name])
                    if (deleteError) {
                        alert('Ошибка удаления: ' + deleteError.message)
                    } else {
                        await loadGallery()
                    }
                }
            })
            container.appendChild(deleteBtn)
        }

        gallery.appendChild(container)
    }
}

// При загрузке страницы
window.addEventListener('load', async () => {
    await checkAuth()
    await loadGallery()
})