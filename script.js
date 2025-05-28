const WARFRAME_STAT_API_URL = "https://api.warframestat.us"
const BROWSE_WF_BASE_URL = "https://browse.wf"
const BROWSE_WF_ICONS_URL = `${BROWSE_WF_BASE_URL}/warframe-public-export-plus/ExportTextIcons.json`
const IMAGE_BASE_URL = "https://cdn.warframestat.us/img"

const weaponVariants = [
        "Prime",
        "Mk1-",
        "Coda",
        "Dex",
        "Kuva",
        "Mutalist",
        "Prisma",
        "Rakta",
        "Sancti",
        "Secura",
        "Synoid",
        "Telos",
        "Tenet",
        "Vandal",
        "Vaykor",
        "Wraith",
    ]


let textIcons = {}
let warframeData = []
let weaponData = []

;(async function () {
    // Add event listeners to the randomize buttons
    document.querySelectorAll(".randomize").forEach((e) =>
        e.addEventListener("click", function (e) {
            e.preventDefault()
            const category = e.target.parentElement.classList[0]

            // Get a random Warframe
            if (category === "warframe" && warframeData && warframeData.length > 0) {
                randomizeWarframe()
            }
            // Get a random weapon
            else if (["primary", "secondary", "melee"].includes(category) && weaponData && weaponData.length > 0) {
                randomizeWeapon(category)
            }
        })
    )

    // Setup the Modal
    const settingsModal = document.querySelector("#settings-modal")

    // Toggle settings modal visibility
    document.querySelector(".settings-icon").addEventListener("click", function () {
        settingsModal.showModal()
    })

    // Close settings when X is clicked
    document.querySelector(".close-settings").addEventListener("click", function () {
        settingsModal.close()
    })

    // Close modal when clicking outside of it
    settingsModal.addEventListener("click", function (event) {
        if (event.target === settingsModal) {
            settingsModal.close()
        }
    })

    // Manual settings-help tooltip placement because anchor is not working
    const settingsHelp = document.querySelector("#settings-help")
    const settingsHelpTooltip = document.querySelector("#settings-help-tooltip")
    settingsHelp.addEventListener("mouseover", function () {
        const rect = settingsHelp.getBoundingClientRect()
        settingsHelpTooltip.style.left = `${rect.left + window.scrollX}px`
        settingsHelpTooltip.style.top = `${rect.bottom + window.scrollY}px`
    })

    // Fetch the text icons
    textIcons = await getTextIcons()

    // Fetch the data
    const [wfData, wData] = await Promise.all([getWarframeData(), getWeaponData()])

    // Store fetched data in global variables
    warframeData = wfData
    weaponData = wData

    // Check for a saved hiddenWarframes list in localStorage. This is used to hide Warframes that the user doesn't want to see when randomizing
    const hiddenWarframes = JSON.parse(localStorage.getItem("hiddenWarframes")) || []
    warframeData.forEach((warframe) => {
        if (hiddenWarframes.includes(warframe.name)) {
            warframe.hidden = true
        }
    })

    // Load all hidden weapons from a single object in localStorage
    const hiddenWeapons = JSON.parse(localStorage.getItem("hiddenWeapons")) || { primary: [], secondary: [], melee: [] }
    weaponData.forEach((weapon) => {
        const category = weapon.category.toLowerCase()
        if (hiddenWeapons[category] && hiddenWeapons[category].includes(weapon.name)) {
            weapon.hidden = true
        }
    })

    // Populate the settings modal with the data lists
    populateItemList("warframe", warframeData, "#warframe-search")
    populateItemList("primary", getWeaponsFromCategory("primary"), "#primary-search")
    populateItemList("secondary", getWeaponsFromCategory("secondary"), "#secondary-search")
    populateItemList("melee", getWeaponsFromCategory("melee"), "#melee-search")

    // Randomize on page load
    document.querySelectorAll(".randomize").forEach((e) => e.click())
})()

/**
 * Populates a list with items and adds functionality for toggling item visibility
 * @param {string} category - Category name (warframe, primary, secondary, melee)
 * @param {Array} items - Array of items to populate the list with
 * @param {string} searchSelector - CSS selector for the search input
 */
function populateItemList(category, items, searchSelector) {
    let lastCheckboxIndex = -1
    let settingsGroup = document.querySelector(`.${category}-settings`)
    let listElement = settingsGroup.querySelector(".settings-list")

    // Clear the list first
    listElement.innerHTML = ""

    // Create the toggles for each item
    items.forEach((item) => {
        const li = document.createElement("li")
        li.classList.add(`settings-list-item`)
        li.classList.add("card")
        li.classList.add("form-item")
        li.innerHTML = `<input type="checkbox" id="${item.name}" ${item.hidden ? "" : "checked"}><label for="${
            item.name
        }">${item.name}</label>`
        listElement.appendChild(li)

        // Add event listener for the checkbox
        li.querySelector("input").addEventListener("click", function (e) {
            const checkbox = e.target
            const itemName = checkbox.id
            const isChecked = checkbox.checked

            // Update the hidden property of the item
            const itemToUpdate = items.find((i) => i.name === itemName)
            if (itemToUpdate) {
                itemToUpdate.hidden = !isChecked
            }

            // If shift is held, check all checkboxes between the last checkbox and the current one
            if (e.shiftKey && lastCheckboxIndex !== -1) {
                const checkboxes = listElement.querySelectorAll("input[type='checkbox']")
                const currentCheckboxIndex = Array.from(checkboxes).indexOf(checkbox)
                const start = Math.min(lastCheckboxIndex, currentCheckboxIndex)
                const end = Math.max(lastCheckboxIndex, currentCheckboxIndex)
                for (let i = start; i <= end; i++) {
                    checkboxes[i].checked = isChecked
                    // Update the hidden property for these items too
                    const itemName = checkboxes[i].id
                    const itemToUpdate = items.find((i) => i.name === itemName)
                    if (itemToUpdate) {
                        itemToUpdate.hidden = !isChecked
                    }
                }
            }

            // If ctrl is held, make all checkboxes match the current checkbox
            if (e.ctrlKey) {
                listElement.querySelectorAll("input[type='checkbox']").forEach((cb) => {
                    cb.checked = isChecked
                    // Update the hidden property for all items
                    const itemName = cb.id
                    const itemToUpdate = items.find((i) => i.name === itemName)
                    if (itemToUpdate) {
                        itemToUpdate.hidden = !isChecked
                    }
                })
            }

            lastCheckboxIndex = Array.from(listElement.children).indexOf(li)

            // Update the hidden items in localStorage
            updateHiddenItems(items)

            // Update the selected count
            updateSelectedCount()
        })
    })

    // Set up search functionality
    if (searchSelector) {
        const searchInput = document.querySelector(searchSelector)
        if (searchInput) {
            searchInput.addEventListener("input", function (e) {
                const searchTerm = e.target.value.toLowerCase()
                const listItems = listElement.querySelectorAll(`li`)
                listItems.forEach((item) => {
                    const label = item.querySelector("label").innerText.toLowerCase()
                    if (label.includes(searchTerm)) {
                        item.style.display = "block"
                    } else {
                        item.style.display = "none"
                    }
                })
                // Update the selected count on page load
                updateSelectedCount()
            })
        }
    }

    // Add event listener for the "Toggle All" button
    settingsGroup.querySelector(".toggle-all").addEventListener("click", function (e) {
        e.preventDefault()
        let checkboxes = listElement.querySelectorAll("input[type='checkbox']")
        let searchedCheckboxes = Array.from(checkboxes).filter(
            (checkbox) => checkbox.parentElement.style.display != "none"
        )
        let searchedChecked = Array.from(searchedCheckboxes).filter((checkbox) => checkbox.checked)

        const checkedCount = searchedChecked.length
        const uncheckedCount = searchedCheckboxes.length - checkedCount
        let majority = checkedCount > uncheckedCount

        // Update both the checkbox states and the item hidden properties
        searchedCheckboxes.forEach((checkbox) => {
            checkbox.checked = !majority

            // Get the corresponding item and update its hidden property
            const itemName = checkbox.id
            const itemToUpdate = items.find((item) => item.name === itemName)
            if (itemToUpdate) {
                itemToUpdate.hidden = !!majority // hidden is inverse of checked
            }
        })

        // Update the hidden items in localStorage
        updateHiddenItems(items)

        // Update the selected count on page load
        updateSelectedCount()
    })

    /**
     * Function to update the selected count
     * This function counts the number of selected checkboxes and updates the description text
     */
    function updateSelectedCount() {
        let checkboxes = listElement.querySelectorAll("input[type='checkbox']")
        let selectedCheckboxes = Array.from(checkboxes).filter((checkbox) => checkbox.checked)
        let searchedCheckboxes = Array.from(checkboxes).filter(
            (checkbox) => checkbox.parentElement.style.display != "none"
        )
        let selectedSearchedCheckboxes = Array.from(searchedCheckboxes).filter((checkbox) => checkbox.checked)
        const description = settingsGroup.querySelector(".description")
        description.innerText = `${selectedSearchedCheckboxes.length} / ${searchedCheckboxes.length}`
        if (checkboxes.length != searchedCheckboxes.length)
            description.innerHTML += ` (${selectedCheckboxes.length}/${checkboxes.length})`
    }

    /**
     * Updates the hidden items list in localStorage
     * @param {Array} items - Array of items to update hidden status for
     */
    function updateHiddenItems(items) {
        if (category === "warframe") {
            // Handle warframes the same way as before
            const hiddenItems = items.filter((item) => item.hidden).map((item) => item.name)
            localStorage.setItem("hiddenWarframes", JSON.stringify(hiddenItems))
        } else {
            // For weapons, update the specific category in the hiddenWeapons object
            const hiddenWeapons = JSON.parse(localStorage.getItem("hiddenWeapons")) || {
                primary: [],
                secondary: [],
                melee: [],
            }
            hiddenWeapons[category] = items.filter((item) => item.hidden).map((item) => item.name)
            localStorage.setItem("hiddenWeapons", JSON.stringify(hiddenWeapons))
        }
    }

    // Update the selected count on page load
    updateSelectedCount()
}

/**
 * Fetches text icons from the browse.wf public export
 * @returns {Promise<Object>} - A promise that resolves to an object containing text icons
 */
async function getTextIcons() {
    return fetch(BROWSE_WF_ICONS_URL)
        .then((response) => {
            if (!response.ok) throw new Error(`Failed to fetch text icons: ${response.status}`)
            return response.json()
        })
        .then((data) => {
            const textIcons = Object.fromEntries(
                Object.entries(data)
                    // Filter text icons that platform doesn't matter
                    .filter(([key, value]) => value.DIT_AUTO)
                    .map(([key, value]) => {
                        const url = value.DIT_AUTO
                        return [key, `${BROWSE_WF_BASE_URL}${url}`]
                    })
            )
            return textIcons
        })
        .catch((error) => {
            console.error("Error fetching text icons:", error)
            return {}
        })
}

/**
 * Replaces text icons in the given text with their corresponding image URLs
 * @param {String} text
 * @returns {String} - The text with placeholders replaced with image elements
 */
function replaceTextIcons(text) {
    return text.replace(/\<(.*?)\>/g, (match, p1) => {
        if (textIcons[p1]) {
            return createIconImage(p1, textIcons[p1]);
        } else if (match.endsWith("/>")) {
            return match; // Keep HTML tags like <br/>
        } else {
            return `<${p1}></${p1}>`; // Create custom HTML tag
        }
    });
}

/**
 * Creates an image element for the given icon name and URL
 * @param {String} name - The name of the icon
 * @param {String} iconUrl - The URL of the icon image
 * @returns {String} - The HTML string for the image element
 */
function createIconImage(name, iconUrl) {
    return `<img src="${iconUrl}" alt="${name}" class="text-icon" />&nbsp;`;
}

/**
 * Fetches Warframe data from the WarframeStat API
 * @returns {Promise<Array>} - A promise that resolves to an array of Warframe objects
 * */
async function getWarframeData() {
    //return await fetch("https://api.warframestat.us/warframes/search/Caliban")
    return await fetch(WARFRAME_STAT_API_URL + "/warframes")
        .then((response) => {
            if (!response.ok) throw new Error(`API error: ${response.status}`)
            return response.json()
        })
        .then((data) => {
            const fetchedData = data
                // Filter to only include Warframes (no mechs, companions, etc.)
                .filter((warframe) => warframe.productCategory == "Suits" && warframe.name !== "Excalibur Umbra")
                // Map the data to the desired format
                .map((warframe) => ({
                    name: warframe.name,
                    description: replaceTextIcons(warframe.description),
                    image: `${IMAGE_BASE_URL}/${warframe.imageName}`,
                    hasPrime: warframe.isPrime,
                    abilities: warframe.abilities.map((ability) => ({
                        name: ability.name,
                        description: replaceTextIcons(ability.description),
                        image: `${IMAGE_BASE_URL}/${ability.imageName}`,
                    })),
                }))
                // Reduce the data to remove duplicates and keep the base version of the Warframe (But with the Prime image)
                .reduce((acc, warframe) => {
                    const baseName = warframe.name.replace(" Prime", "")
                    if (!acc[baseName]) {
                        acc[baseName] = warframe
                    } else if (warframe.hasPrime) {
                        acc[baseName].image = warframe.image
                        acc[baseName].hasPrime = true
                    }
                    return acc
                }, {})
            return Object.values(fetchedData)
        })
        .catch((error) => {
            console.error("Failed to fetch Warframe data:", error)
            return []
        })
}

/**
 * Fetches weapon data from the WarframeStat API
 * @returns {Promise<Array>} - A promise that resolves to an array of weapon objects
 */
async function getWeaponData() {
    
    return fetch(WARFRAME_STAT_API_URL + "/weapons")
        .then((response) => {
            if (!response.ok) throw new Error(`API error: ${response.status}`)
            return response.json()
        })
        .then((data) => {
            const fetchedData = data

                // Filter to only include full weapons (no parts)
                .filter(
                    (weapon) =>
                        (weapon.category == "Primary" ||
                            weapon.category == "Secondary" ||
                            weapon.category == "Melee") &&
                        weapon.description != "" &&
                        weapon.uniqueName.indexOf("Doppelganger") === -1 // Exlude Doppelganger weapons (Currently only found the Grimoire)
                )
                // Map the data to the desired format
                .map((weapon) => ({
                    name: weapon.name,
                    description: replaceTextIcons(weapon.description),
                    type: weapon.type,
                    category: weapon.category,
                    image: `${IMAGE_BASE_URL}/${weapon.imageName}`,
                }))

            // Group base weapons and their variants
            let weaponList = [...fetchedData]

            // Map for quick lookup by name
            const weaponMap = new Map(weaponList.map((w) => [w.name, w]))

            // Process variants
            weaponList = weaponList.filter((weapon) => {
                let variantType = weaponVariants.find((variant) => weapon.name.includes(variant))
                if (variantType) {
                    // Get base weapon name by removing variant string
                    const baseName = weapon.name.replace(new RegExp(`\\s*${variantType}\\s*`, "i"), "").trim()
                    const baseWeapon = weaponMap.get(baseName)
                    if (baseWeapon) {
                        variantType = variantType === "Mk1-" ? "Mk1" : variantType // Normalize Mk1- to Mk1
                        baseWeapon.variants = baseWeapon.variants || []
                        baseWeapon.variants.push({
                            name: weapon.name,
                            image: weapon.image,
                            description: weapon.description,
                            variantType,
                        })
                        return false
                    }
                }
                return true
            })

            console.log(weaponList)
            return Object.values(weaponList)
        })
        .catch((error) => {
            console.error("Failed to fetch weapon data:", error)
            return []
        })
}

// Function to filter weapons by category
function getWeaponsFromCategory(category) {
    // Capitalize the first letter of the category
    category = category.charAt(0).toUpperCase() + category.slice(1)
    return weaponData.filter((weapon) => weapon.category === category)
}

/**
 * Randomizes a Warframe and updates the UI
 */
function randomizeWarframe() {
    // Get the Warframes that are visible
    const visibleWarframes = warframeData.filter((warframe) => !warframe.hidden)

    // Check if there are any visible Warframes
    if (visibleWarframes.length === 0) {
        alert("Not enough Warframes available. Please check your settings.")
        document.querySelector(".warframe").classList.add("skeleton")
        document.querySelectorAll(".warframe .image").forEach((img) => {
            img.removeAttribute("src")
        })
        return
    }

    // Get a random Warframe from the data
    const randomWarframe = visibleWarframes[Math.floor(Math.random() * visibleWarframes.length)]

    // Update the Warframe image, name, and description
    document.querySelector(".warframe .image").src = randomWarframe.image
    document.querySelector(".warframe .image").alt = randomWarframe.name
    document.querySelector(".warframe .name").innerHTML = randomWarframe.name
    document.querySelector(".warframe .description").innerHTML = randomWarframe.description

    // Update the Warframe's abilities'
    const abilities = document.querySelectorAll(".warframe .ability")
    randomWarframe.abilities.forEach((ability, index) => {
        abilities[index].querySelector(".image").src = ability.image
        abilities[index].querySelector(".image").alt = ability.name
        abilities[index].querySelector(".name").innerHTML = ability.name
        abilities[index].querySelector(".description").innerHTML = ability.description
    })

    // Remove skeleton class after data is loaded
    document.querySelector(".warframe").classList.remove("skeleton")
}

/**
 * Randomizes a weapon from the selected category, and updates the UI
 * @param {string} category - The category of the weapon (primary, secondary, melee)
 */
function randomizeWeapon(category) {
    // Get the weapons from the selected category
    const weapons = getWeaponsFromCategory(category)

    // Filter the weapons to only include visible ones
    const visibleWeapons = weapons.filter((weapon) => !weapon.hidden)

    // Check if there are any visible weapons
    if (visibleWeapons.length === 0) {
        alert(`Not enough ${category} weapons available. Please check your settings.`)
        document.querySelector(`.${category}`).classList.add("skeleton")
        document.querySelector(`.${category} .image`).removeAttribute("src")
        return
    }

    // Get a random weapon from the data
    const randomWeapon = visibleWeapons[Math.floor(Math.random() * visibleWeapons.length)]

    // Update the weapon image, name, and description
    document.querySelector(`.${category} .image`).src = randomWeapon.image
    document.querySelector(`.${category} .image`).alt = randomWeapon.name
    document.querySelector(`.${category} .name`).innerHTML = randomWeapon.name
    document.querySelector(`.${category} .description`).innerHTML = randomWeapon.description

    // If the weapon has variants, display them
    const variantsContainer = document.querySelector(`.${category} .variants`)
    if (randomWeapon.variants && randomWeapon.variants.length > 0) {
        variantsContainer.innerHTML = "" // Clear previous variants
        randomWeapon.variants.forEach((variant, i) => {
            const variantElement = document.createElement("div")
            variantElement.classList.add("variant")
            // variantElement.classList.add("card")
            variantElement.title = variant.description
            variantElement.id = `${category}-variant-card-${i}`
            variantElement.innerHTML = `
                <img src="${variant.image}" alt="${variant.name}" class="image" />
                <p class="name">${variant.variantType}</p>
            `
            variantsContainer.appendChild(variantElement)
        })
    } else {
        variantsContainer.innerHTML = "" // Clear variants if none exist
    }

    // Remove skeleton class after data is loaded
    document.querySelector(`.${category}`).classList.remove("skeleton")
}
