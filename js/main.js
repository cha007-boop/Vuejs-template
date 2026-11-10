const authURL = ''
const baseURL = ''

const tokenName = 'userInfo'

const app = Vue.createApp({
    data() {
        return {
            intro: 'Welcome to my Vue template',
            list: [],
            newItem: {
                prop: 'value'
            },
            sortBy: null,
            sortAscending: true,
            editingId: null, // Keeps track of what item is being edited
            editItem: null, // Temporary item to store updated values
            isUpdating: false, // Keeps track of whether something is being updated or not
            deletingId: null, // Keeps track of what item to delete
            deleteTarget: null,
            updateMessage: '',
            updateError: '',
            deleteError: '',
            isSubmitting: false,
            postMessage: '',
            postError: '',
            errorMessage: '',

            auth: { username: '', password: '' },
            userInfo: null,
            authMessage: '',
            isLoggingIn: false
        }
    },
    mounted() {
        this.getAll()
    },
    created() {
        const userInfoStr = localStorage.getItem(tokenName);
        if (userInfoStr != null) {
            this.userInfo = JSON.parse(userInfoStr);
            this.getAll(); // Fetch aktiehandels immediately if user is already logged in
        }
    },
    methods: {
        parseJwt(token) {
            const payload = token.split('.')[1];

            // Convert Base64URL to regular Base64
            const base64 = payload
                .replace(/-/g, '+')
                .replace(/_/g, '/');

            // Decode and convert to JSON
            const decodedPayload = atob(base64);

            return JSON.parse(decodedPayload);
        },
        login() {
            this.isLoggingIn = true
            this.authMessage = ''

            axios
                .post(authURL, this.auth)
                .then(response => {
                    if (!response.data?.token) {
                        throw new Error('The login response did not include an authentication token.')
                    }

                    this.userInfo = {
                        username: this.auth.username,
                        role: this.parseJwt(response.data.token)["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],
                        token: response.data.token
                    }
                    localStorage.setItem(tokenName, JSON.stringify(this.userInfo))
                    this.auth.password = ''
                    bootstrap.Dropdown.getOrCreateInstance(document.getElementById('loginDropdown')).hide()
                    this.getAll()
                })
                .catch((error) => {
                    this.authMessage = this.getRequestErrorMessage(error)
                })
                .finally(() => {
                    this.isLoggingIn = false
                })

        },
        logout() {
            localStorage.removeItem(tokenName)
            this.userInfo = null
            this.auth = { username: '', password: '' }
            this.activeView = 'filter'
            this.editingId = null
            this.editAktie = null
        },
        // Fetch items using the current filters and sort order.
        getAll() {
            const params = {}
            const filters = {
                // FILL WITH FILTER VALUES FROM data()
            }
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    params[key] = value
                }
            })

            if (this.sortBy) {
                params.sortBy = this.sortBy
                params.sortOrder = this.sortAscending ? 'asc' : 'desc'
            }
            // Axios serializes params as URL query parameters.
            axios
                .get(baseURL, { params })
                .then((response) => {
                    this.list = response.data
                    this.errorMessage = ''
                })
                .catch((error) => {
                    console.log(error)
                    this.list = []
                    this.errorMessage = this.getRequestErrorMessage(error)
                })
        },
        // Sort by a column, toggling direction when it is already selected.
        sortByColumn(column) {
            if (this.sortBy === column) {
                this.sortAscending = !this.sortAscending
            } else {
                this.sortBy = column
                this.sortAscending = true
            }
            // If doing sorting in back-end
            this.getAll()

            // // If doing sorting in front-end
            // if (sortBy === 'abc'){
            //     this.list.sort((a,b) => a.abc - b.abc)
            // }
            // //else if...
        },
        // Create an item and reset the form after success.
        postItem() {
            this.isSubmitting = true
            this.postMessage = ''
            this.postError = ''
            axios
                .post(baseURL, this.newItem, {
                    headers: {
                        'Authorization': 'Bearer ' + this.userInfo.token
                    }
                })
                .then((response) => {
                    console.log('Post method called')
                    this.list.push(response.data)
                    this.postMessage = 'Item added successfully.'
                    this.newItem = {

                    }
                })
                .catch((error) => {
                    this.postError = this.getRequestErrorMessage(error)
                })
                .finally(() => {
                    this.isSubmitting = false
                })
        },
        // Copy a Item's values into the inline editor.
        startEdit(item) {
            this.editingId = item.id
            this.editAktie = {
                prop: item.prop,
                // Fill with rest of properties

            }
            this.updateMessage = ''
            this.updateError = ''
        },
        // Discard the inline edits without saving.
        cancelEdit() {
            this.editingId = null
            this.editAktie = null
            this.updateError = ''
        },
        putItem() {
            if (!this.editItem || this.editingId === null) {
                return
            }

            this.isUpdating = true
            this.updateMessage = ''
            this.updateError = ''
            const id = this.editingId
            const updatedItem = { id, ...this.editItem }

            axios
                .put(baseURL + id, updatedItem)
                .then((response) => {
                    // Update the local list with the new values, using the response data if available.
                    const index = this.list.findIndex((item) => item.id === id)
                    if (index !== -1) {
                        this.list.splice(index, 1, {
                            ...this.list[index],
                            ...(response.data && typeof response.data === 'object'
                                ? response.data
                                : updatedItem),
                        })
                        // Using ... this way preserves properties that aren't included in replacement data
                    }
                    this.editingId = null
                    this.editItem = null
                    this.updateMessage = 'Item updated successfully.'
                    this.getAll()
                })
                .catch((error) => {
                    this.updateError = this.getRequestErrorMessage(error)
                })
                .finally(() => {
                    this.isUpdating = false
                })
        },
        // Select an item and show the Bootstrap deletion confirmation.
        openDeleteModal(item) {
            this.deleteTarget = item
            this.deleteError = ''
            bootstrap.Modal.getOrCreateInstance(document.getElementById('deleteModal')).show()
        },
        // Delete the confirmed item with a DELETE request
        deleteItem() {
            const item = this.deleteTarget
            if (!item) {
                return
            }

            this.deletingId = item.id
            this.deleteError = ''

            axios
                .delete(baseURL + item.id)
                .then(() => {
                    this.list = this.list.filter((item) => item.id !== item.id)
                    bootstrap.Modal.getOrCreateInstance(document.getElementById('deleteModal')).hide()
                    this.deleteTarget = null
                })
                .catch((error) => {
                    this.deleteError = this.getRequestErrorMessage(error)
                })
                .finally(() => {
                    this.deletingId = null
                })
        },
        // Extract a readable message from an Axios error.
        getRequestErrorMessage(error) {
            const responseData = error.response?.data
            if (typeof responseData === 'string') {
                return responseData
            }
            if (responseData?.title || responseData?.message) {
                return responseData.title || responseData.message
            }
            if (responseData && typeof responseData === 'object') {
                return JSON.stringify(responseData)
            }
            return error.message || 'The request failed.'
        },
    },
    computed: {
        myComputed() {
            return ''
        },
    }
})