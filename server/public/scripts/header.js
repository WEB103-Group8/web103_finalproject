// Create a new header element
const header = document.querySelector('header')

// Create a nav element (styled by Picocss as a site header)
const nav = document.createElement('nav')
nav.className = 'container'

// Left side: logo, with the site name and tagline stacked next to it
const leftList = document.createElement('ul')
const leftItem = document.createElement('li')
leftItem.className = 'brand'

const headerLogo = document.createElement('img')
headerLogo.src = '/logo.svg'
headerLogo.alt = "Founder's Guide logo"
headerLogo.className = 'logo'

const brandText = document.createElement('div')
brandText.className = 'brand-text'

const headerTitle = document.createElement('strong')
headerTitle.className = 'site-title'
headerTitle.textContent = "Founder's Guide"

const headerTagline = document.createElement('p')
headerTagline.className = 'site-tagline'
headerTagline.appendChild(document.createTextNode('No matter what stage you are at opening up a business, we have a tutorial for you! Looking to brainstorm business ideas and find your niche? We can guide you in the right direction!'))
headerTagline.appendChild(document.createElement('br'))
headerTagline.appendChild(document.createTextNode('Finding the right partner? Growing your team? Talking to suppliers? We have a short guide for each one of those. Our guides are sorted into different categories (including business models, product development, sales, market research, and funding) so you can browse or filter to personalize your experience.'))

brandText.appendChild(headerTitle)
brandText.appendChild(headerTagline)

leftItem.appendChild(headerLogo)
leftItem.appendChild(brandText)
leftList.appendChild(leftItem)

// Right side: home button
const rightList = document.createElement('ul')
const rightItem = document.createElement('li')

const headerButton = document.createElement('a')
headerButton.textContent = 'Home'
headerButton.setAttribute('role', 'button')
headerButton.href = '/'

rightItem.appendChild(headerButton)
rightList.appendChild(rightItem)

// Append the left and right lists to the nav element
nav.appendChild(leftList)
nav.appendChild(rightList)

// Append the nav to the header element
header.appendChild(nav)
