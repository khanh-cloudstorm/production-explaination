import React, { Component, Fragment } from 'react'
import {groupBy, flatten, sumBy, isInteger, startCase, uniq, difference} from 'lodash'

let groupItems = (items, key) => {
  return groupBy(items, item => item[key])
}

class ExplainPage extends Component {
  constructor(props) {
    super(props)
    this.state = {
      foods: [],
      items: [],
      menu_categories: [],
      advance_orders: [],
      people: {},
      searchFood: '',
      selectedPersonId: 'nothing_selected',
      selectedFoodId: null,
      domain: 'http://localhost:3000',
      currentMealId: null,
      mealMapper: { 1: 'Breakfast', 3: 'Lunch', 5: 'Dinner' },
      showForecast: true,
      showAdvanceOrder: true,
      showNonSelect: true
    }
  }

  updateExplainState = (e) => {
    try{
      let jsonData = JSON.parse(e.target.value)
      this.setState({
        items: jsonData.items,
        foods: jsonData.foods,
        menu_categories: jsonData.menu_categories,
        people: jsonData.people,
        currentMealId: jsonData.meal_id
      })
    }catch{
      return
    }
  }

  renderActionContainer = () => {
    return(
      <div className="action-container">
        <div style={{display: 'flex'}} className="header">
          <h1>Explain Json</h1>
          <input onChange={(e) => this.setState({domain: e.target.value})} placeholder="Enter your server"/>
        </div>
        <div className="json-input-wrapper">
          <textarea onChange={this.updateExplainState}></textarea>
        </div>
        <div className="search-food-wrapper">
          <input type="text" onChange={(e) => this.setState({searchFood: e.target.value})} placeholder="Search food"/>
        </div>
      </div>
    )
  }

  
  renderExplainGroupByCalculateMethod = () => {
    let calculateBy = method => item => item.calculate_from == method
    let byForecastItems = this.state.items.filter(calculateBy('forecast'))
    let byGetAdvancerOrderItems = this.state.items.filter(calculateBy('get_advance_order'))
    let byNonSelectItems = this.state.items.filter(calculateBy('get_non_select'))
    return(
      <div>
        <h3 onClick={() => this.setState({showForecast: !this.state.showForecast})}>{`By Forecast ${this.state.showForecast ? '' : '- Hided'}`}</h3>
        <div style={this.state.showForecast ? {} : {'display': 'none'}}>{this.renderItemsGroupedByFood(byForecastItems)}</div>
        <h3 onClick={() => this.setState({showAdvanceOrder: !this.state.showAdvanceOrder})}>{`By Get Advance Orders ${this.state.showAdvanceOrder ? '' : '- Hided'}`}</h3>
        <div style={this.state.showAdvanceOrder ? {} : {'display': 'none'}}>{this.renderItemsGroupedByFood(byGetAdvancerOrderItems)}</div>
        <h3 onClick={() => this.setState({showNonSelect: !this.state.showNonSelect})}>{`By Get Non Select ${this.state.showNonSelect ? '' : '- Hided'}`}</h3>
        <div style={this.state.showNonSelect ? {} : {'display': 'none'}}>{this.renderItemsGroupedByFood(byNonSelectItems)}</div>
      </div>
    )
  }

  getPersonName = personId => {
    let person = this.state.people[personId]
    return person ? person.name : 'Forecast'
  }

  getValidFoods = () => {
    let search = this.state.searchFood
    if(!search){return this.state.foods}

    if(isInteger(search)){ return this.searchByFoodId(search) }
    return this.searchByFoodName(search)
  }

  searchByFoodName = (name) => {
    return this.state.foods.filter((food) => food.name.toLowerCase().includes(name.toLowerCase()))
  }

  searchByFoodId = (id) => {
    return this.state.foods.filter((food) => food.id == parseInt(id))
  }

  renderItemsGroupedByFood = items => {
    let itemsGroupedByFoodId = groupItems(items, 'food_id')
    let foodIds = Object.keys(itemsGroupedByFoodId)
    return(
      <Fragment>
        {foodIds.map((foodId) => {
          let validFoods = this.getValidFoods()
          let food = validFoods.find(food => food.id == foodId)
          let itemsGroupedbyAdjustment = groupItems(itemsGroupedByFoodId[foodId], 'adjustment')
          let adjustments = Object.keys(itemsGroupedbyAdjustment)
          if(!food) {return null}
          return adjustments.map((adjustment) => {
            let groupedItems = itemsGroupedbyAdjustment[adjustment]
            let personIds = flatten(groupedItems.map((i) => i.person_ids))
            let servings = sumBy(groupedItems, 'quantity')
            let menuCategoryIds = groupedItems.map((e) => e.menu_category_id)
            return(
              <Fragment>
                {this.renderFoodInfo(food, adjustment, personIds, servings, menuCategoryIds)}
              </Fragment>
            )
          })
        })}
      </Fragment>
    )
  }

  countPeople = (personIds) => {
    return personIds.filter(personId => personId).length
  }

  renderFoodInfo = (food, adjustment, personIds, servings, menuCategoryIds) =>  {
    let isSelectedFood = this.state.selectedFoodId == food.id
    let personCount = this.countPeople(personIds)
    let menuCategoryNames = this.state.menu_categories.filter(([name, id]) => {
      return menuCategoryIds.includes(id)
    })
    return(
      <div className={`food-info ${isSelectedFood ? 'selected' : '' }`}>
        <div className={`food-info__food_name`}
             onClick={() => this.setState({selectedFoodId: food.id})}>
          <span>{`${food.name} (${food.id})`}</span>
          <div className="additional-info">
            <span>{`Adjust: ${adjustment}, Servings: ${servings}, `}</span>
            <span style={servings != personCount ? {'color': 'red'} : {}}>{`Person Count: ${personCount}`}</span>
            <div>{ menuCategoryNames.map(([name, id]) => name).join(',') }</div>
          </div>
        </div>
        <div className="people-wrapper">
          {personIds.map(personId => {
            let appearance = personIds.reduce((memo, current) => current == personId ? memo + 1 : memo, 0)
            return this.renderPersonLabel(personId, appearance > 1)
          })}
        </div>
      </div>
    )
  }

  renderPersonLabel = (personId, isDuplicate = false) => {
    let personName = this.getPersonName(personId)
    let labelType = personId ? 'person_name' : 'manual_census'
    let selectedLabel = this.isSelected(personId) ? 'selected' : ''
    let warning = isDuplicate ? 'warning' : ''
    return(<span key={personId}
                  className={`${labelType} ${selectedLabel} ${warning}`}
                  onClick={() => this.setState({selectedPersonId: personId || 'manual_census'})}>
            {personName}
            </span>)
  }

  isSelected = (personId) => {
    if(this.state.selectedPersonId == personId){return true}
    if(this.state.selectedPersonId == 'manual_census' && !personId) {return true}
    return false
  }

  getMealName = (id) => {
    return this.state.mealMapper[id]
  }

  renderPersonInfo = () => {
    let person = this.state.people[this.state.selectedPersonId]
    if(!person){return}
    return(
      <div className="person-info">
        <div className="person-info__name">{person.name}</div>
        <div className="person-info__service_types_wrapper">
          <Fragment>
            {person.service_types.map(([mealId, serviceType]) => {
              let mealName = this.getMealName(mealId)
              let isCurrentMeal = mealId == this.state.currentMealId
              return(<div class={isCurrentMeal ? 'current-meal' : ''} key={`${this.state.selectedPersonId}-${mealId}-${serviceType}`}>{`${mealName}: ${startCase(serviceType)}`}</div>)
            })}
          </Fragment>
        </div>
        <div className="person-info__action-wrapper">
          <button onClick={() => this.goToEditForm()}>Go To Edit Form</button>
          <button onClick={() => this.goToPersonalMenu()}>Go To Personal Menu</button>
        </div>
      </div>
    )
  }

  goToEditForm = () => {
    let url = `${this.state.domain || 'http://locahost:3000'}/people/${this.state.selectedPersonId}`
    window.open(url)
  }

  goToPersonalMenu = () => {
    let url = `${this.state.domain || 'http://locahost:3000'}/people/${this.state.selectedPersonId}/personal_menus`
    window.open(url)
  }

  peopleUseIn = method => {
    let personIds = this.state
                        .items
                        .filter((item) => item.calculate_from == method)
                        .map((item) => item.person_ids)
    return uniq(flatten(personIds).filter(id => id))

  }

  renderAnalysis = () => {
    let peopleUseInForecast = this.peopleUseIn('forecast')
    let peopleUseInAdvanceOrder = this.peopleUseIn('get_advance_order')
    let peopleUseInNonSelect = this.peopleUseIn('get_non_select')
    let peopleInAccount = Object.keys(this.state.people)
    let peopleMissingFromCalculation = difference(peopleInAccount, [...peopleInAccount, ...peopleUseInAdvanceOrder, ...peopleUseInNonSelect])
    return(
      <div className="analysis-wrapper">
        <h3>Analysis</h3>
        <div>{`Total people in account: ${peopleInAccount.length}`}</div>
        <div>{`Total people in forecast: ${peopleUseInForecast.length}`}</div>
        <div>{`Total people in advance order: ${peopleUseInAdvanceOrder.length}`}</div>
        <div>{`Total people in non select: ${peopleUseInNonSelect.length}`}</div>
        <div>
          <span>People Missing From Calculation:</span>
          <span>{peopleMissingFromCalculation.map((personId) => this.renderPersonLabel(personId))}</span>
        </div>
      </div>
    )
  }
  
  render() {
    return(
      <div>
        <Fragment>{this.renderActionContainer()}</Fragment>
        <div className="explain-container">
          <Fragment>{this.renderAnalysis()}</Fragment>
          <Fragment>{this.renderPersonInfo()}</Fragment>
          <Fragment>{this.renderExplainGroupByCalculateMethod()}</Fragment>
        </div>
      </div>
    )
  }
}

export default ExplainPage;