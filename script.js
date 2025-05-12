let textIcons = {}
// Declare global variables to store data
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

    // Fetch the text icons
    textIcons = await getTextIcons()

    // Fetch the data
    const [wfData, wData] = await Promise.all([
        getWarframeData().then((data) => {
            if (data && data.length > 0) {
                // Remove skeleton classes in the .warframe parent
                document.querySelectorAll(".warframe .skeleton").forEach((e) => {
                    if (e.classList.contains("image")) {
                        e.addEventListener("load", () => e.classList.remove("skeleton"))
                    } else {
                        e.classList.remove("skeleton")
                    }
                })
            }
            return data || []
        }),
        getWeaponData().then((data) => {
            if (data && data.length > 0) {
                // Remove skeleton classes in the weapon parents
                document.querySelectorAll(".weapons .skeleton").forEach((e) => {
                    if (e.classList.contains("image")) {
                        e.addEventListener("load", () => e.classList.remove("skeleton"))
                    } else {
                        e.classList.remove("skeleton")
                    }
                })
            }
            return data || []
        }),
    ])

    // Store fetched data in global variables
    warframeData = wfData
    weaponData = wData

    // Randomize on page load
    document.querySelectorAll(".randomize").forEach((e) => e.click())
})()

// Function to fetch text icons
async function getTextIcons() {
    return fetch("https://browse.wf/warframe-public-export-plus/ExportTextIcons.json")
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
                        return [key, `https://browse.wf${url}`]
                    })
            )
            return textIcons
        })
        .catch((error) => {
            console.error("Error fetching text icons:", error)
            return {}
        })
}

// Function to replace text icons in text
function replaceTextIcons(text) {
    return text.replace(/\<(.*?)\>/g, (match, p1) => {
        const textIcon = textIcons[p1]

        // Check if the text icon exists in the textIcons object
        // If it does, replace it with the corresponding image
        if (textIcon) {
            return `<img src="${textIcon}" alt="${p1}" class="text-icon" />&nbsp;`
        } else {
            // If it has a closing symbol (/>) at the end, return it as is (Some descriptions contain <br/> tags)
            const hasClosingTag = match.endsWith("/>")
            if (hasClosingTag) {
                return match
            }
            // If it doesn't, return a custom HTML tag that closes. Example: <DT_POISION> will be replaced with <DT_POISION></DT_POISION>
            else {
                match = `<${p1}></${p1}>`
                return match
            }
        }
    })
}

// Function to fetch Warframe data
async function getWarframeData() {
    //return await fetch("https://api.warframestat.us/warframes/search/Caliban")
        return await fetch("https://api.warframestat.us/warframes")
        .then((response) => {
            if (!response.ok) throw new Error(`API error: ${response.status}`)
            return response.json()
        })
        .then((data) => {
            const fetchedData = data
                // Filter to only include Warframes (no mechs, companions, etc.)
                .filter(
                    (warframe) =>
                        warframe.productCategory == "Suits" &&
                        warframe.name !== "Excalibur Umbra"
                )
                // Map the data to the desired format
                .map((warframe) => ({
                    name: warframe.name,
                    description: replaceTextIcons(warframe.description),
                    image: "https://cdn.warframestat.us/img/" + warframe.imageName,
                    hasPrime: warframe.isPrime,
                    abilities: warframe.abilities.map((ability) => ({
                        name: ability.name,
                        description: replaceTextIcons(ability.description),
                        image: "https://cdn.warframestat.us/img/" + ability.imageName,
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

// Function to fetch weapon data
async function getWeaponData() {
    return fetch("https://api.warframestat.us/weapons")
        .then((response) => {
            if (!response.ok) throw new Error(`API error: ${response.status}`)
            return response.json()
        })
        .then((data) => {
            const fetchedData = data

                // Filter to only include full weapons (no parts)
                .filter(
                    (weapon) =>
                        (weapon.productCategory == "LongGuns" ||
                            weapon.productCategory == "Pistols" ||
                            weapon.productCategory == "Melee")
                )
                // Map the data to the desired format
                .map((weapon) => ({
                    name: weapon.name,
                    description: replaceTextIcons(weapon.description),
                    type: weapon.type,
                    category: weapon.category,
                    image: "https://cdn.warframestat.us/img/" + weapon.imageName,
                    hasPrime: weapon.isPrime,
                }))
                // Reduce the data to remove duplicates and keep the base version of the weapon (But with the Prime image)
                .reduce((acc, weapon) => {
                    const baseName = weapon.name.replace(" Prime", "")
                    if (!acc[baseName]) {
                        acc[baseName] = weapon
                    } else if (weapon.hasPrime) {
                        acc[baseName].image = weapon.image
                        acc[baseName].hasPrime = true
                    }
                    return acc
                }, {})

            return Object.values(fetchedData)
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

// Function to randomize Warframe
function randomizeWarframe() {
    // Get a random Warframe from the data
    const randomWarframe = warframeData[Math.floor(Math.random() * warframeData.length)]

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
}

// Function to randomize weapon
function randomizeWeapon(category) {
    // Get the weapons from the selected category
    const weapons = getWeaponsFromCategory(category)

    // Get a random weapon from the data
    const randomWeapon = weapons[Math.floor(Math.random() * weapons.length)]

    // Update the weapon image, name, and description
    document.querySelector(`.${category} .image`).src = randomWeapon.image
    document.querySelector(`.${category} .image`).alt = randomWeapon.name
    document.querySelector(`.${category} .name`).innerHTML = randomWeapon.name
    document.querySelector(`.${category} .description`).innerHTML = randomWeapon.description
}
