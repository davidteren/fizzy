import { Controller } from "@hotwired/stimulus"
import { debounce } from "helpers/timing_helpers";

export default class extends Controller {
  static classes = ["filtersSet"]
  static targets = ["field"]

  initialize() {
    this.debouncedChange = debounce(this.change.bind(this), 50)
  }

  connect() {
    this.change()
  }

  change() {
    this.#toggleFiltersSetClass()
  }

  async fieldTargetConnected(field) {
    this.debouncedChange()
  }

  #toggleFiltersSetClass(shouldAdd) {
    this.element.classList.toggle(this.filtersSetClass, this.#hasFiltersSet)
  }

  get #hasFiltersSet() {
    return this.fieldTargets.some(field => this.#isFieldSet(field))
  }

  #isFieldSet(field) {
    const value = field.value?.trim()

    if (!value) return false

    const defaultValue = this.#defaultValueForField(field)
    return defaultValue ? value !== defaultValue : true
  }

  #defaultValueForField(field) {
    const comboboxContainer = field.closest("[data-combobox-default-value-value]")
    return comboboxContainer?.dataset?.comboboxDefaultValueValue
  }
}
