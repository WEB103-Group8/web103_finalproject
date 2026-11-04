// Dynamically display tip details
const renderTip = async () => {
    // Parse ID as an int from url
    const requestedID = parseInt(window.location.href.split('/').pop())

    // Fetch tip data using /tips endpoint and parse response as a JSON
    const response = await fetch('/tips')
    const data = await response.json()

    // Point to the element with ID
    const tipContent = document.getElementById('tip-content')

    // Find the tip with the requested ID
    const tip = data.find(tip => tip.id === requestedID)

    if (tip) {
        // Set the src of the image element to the matching tip's image.
        document.getElementById('image').src = tip.image
        document.getElementById('image').alt = tip.title
        // Set the text content of the element with the ID title to matching tip's title.
        document.getElementById('title').textContent = tip.title
        // Set the text content of the element with the ID category to the matching tip's category.
        document.getElementById('category').textContent = tip.category
        // Set the text content of the element with the ID submittedBy to the matching tip's submitter.
        document.getElementById('submittedBy').textContent = tip.submittedBy
        // Set the text content of the element with the ID text to the matching tip's text.
        document.getElementById('text').textContent = tip.text
        // Set the title of the page to the tip's title.
        document.title = `Founder's Guide - ${tip.title}`
    }
    else { // If tip is not found, clear the empty layout and show a centered message instead
        tipContent.innerHTML = ''
        const message = document.createElement('h2')
        message.className = 'tip-not-found'
        message.textContent = 'Tip Not Found 😞'
        tipContent.appendChild(message)
    }

    // Reveal the content only once it's fully populated, so nothing (like the Back button) flashes in early
    tipContent.hidden = false
}

renderTip()
