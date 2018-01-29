import React from 'react'
import {Alert, StyleSheet, Text, View, ScrollView, Button} from 'react-native'
import spells from './dnd-spells/spells8.json'
import HTMLView from 'react-native-htmlview'
import {getCharacter, slugify} from './auth'
import {colors, BaseText, B, LightBox, showLightBox, Touchable, TextInput} from './styles.js'
import {SectionList} from './sectionlist'

const numSlotLevels = 9

const spellMap = {}
spells.forEach(spell => {
  spellMap[slugify(spell.name)] = spell
})

export class CastSpellScreen extends React.Component {
  render () {
    return <LightBox title='Cast Spell'>
      {
        Object.values(this.props.slots).map((slot, i) => <View
          key={i}
          style={styles.buttonMargin}>

          <Button
            title={this._title(slot)}
            onPress={() => this._cast(slot)}
          />
        </View>)
      }
    </LightBox>
  }

  _cast (slot) {
    getCharacter().then(character => {
      character.collection('slots').doc(slot.id).collection('spells').add({
        spell: this.props.spell.name
      }).then(() => {
        this.props.navigator.dismissLightBox()
      })
    })
  }

  _title (slot) {
    const used = (slot.spells || []).length
    return `Level ${slot.id} (used ${used} / ${slot.count})`
  }
}

class Quote extends React.Component {
  render () {
    return (
      <View style={{
        borderLeftWidth: 2,
        borderLeftColor: colors.primary,
        paddingLeft: 5,
        marginTop: 5,
        marginBottom: 5
      }}>
        {this.props.children}
      </View>
    )
  }
}

class SpellItem extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      showDetail: false,
      spellData: {}
    }
  }

  componentDidMount () {
    getCharacter().then(character => {
      this.spell = character.collection('spells').doc(slugify(this.props.spell.name))
      this.unsubscribe = this.spell.onSnapshot(spell => {
        this.setState(state => {
          return {spellData: spell.data() || {}}
        })
      })
    })
  }

  componentWillUnmount () {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
  }

  render () {
    return (
      <View>
        <Touchable onPress={this._onPress.bind(this)}>
          <View style={styles.item}>
            <View style={styles.row}>
              <View>
                <B>{this.props.spell.name}</B>
                <BaseText>{this.props.spell.class}</BaseText>
                <BaseText>{this.props.spell.school}</BaseText>
              </View>
              <View style={styles.right}>
                <BaseText>{this.props.spell.level}</BaseText>
                <BaseText>{this.props.spell.page}</BaseText>
                <BaseText>{this.props.spell.casting_time}, {this.props.spell.components}</BaseText>
              </View>
            </View>

            {this.detail()}
          </View>
        </Touchable>
      </View>
    )
  }

  detail () {
    if (!this.state.showDetail) {
      return
    }

    return <View style={styles.detail}>
      <View style={styles.row}>
        <View style={styles.grow}>
          <B>Duration</B>
          <BaseText>{this.props.spell.duration}</BaseText>
        </View>

        <View style={styles.grow}>
          <B>Range</B>
          <BaseText>{this.props.spell.range}</BaseText>
        </View>

        {this.props.spell.material ? <View style={styles.grow}>
          <B>Material</B>
          <BaseText>{this.props.spell.material}</BaseText>
          </View> : <View />}
      </View>

      <View style={styles.row}>
        <View style={styles.grow}>
          <B>Concentration</B>
          <BaseText>{this.props.spell.concentration}</BaseText>
        </View>

        <View style={styles.grow}>
          <B>Ritual</B>
          <BaseText>{this.props.spell.ritual}</BaseText>
        </View>
      </View>

      <B>Description</B>
      <Quote>
        <HTMLView
          value={this.props.spell.desc}
        />
      </Quote>

      {this.higherLevel()}

      <View style={styles.row}>
        <Button
          title='Cast'
          onPress={() => this._castSpell()}
        />

        {
          this.state.spellData.prepared
            ? <Button
              title='Unprepare'
              onPress={() => this._prepareSpell(false)}
            />
            : <Button
              title='Prepare'
              onPress={() => this._prepareSpell(true)}
            />
        }

        {
          this.state.spellData.active
            ? <Button
              title='Remove'
              onPress={() => this._addSpell(false)}
            />
            : <Button
              title='Add'
              onPress={() => this._addSpell(true)}
            />
        }
      </View>
    </View>
  }

  _addSpell (active) {
    this.spell.set({active}, {merge: true})
  }

  _castSpell () {
    showLightBox(this.props.navigator, 'dnd.CastSpellScreen', {
      slots: this.props.slots,
      spell: this.props.spell
    })
  }

  _clearCasts () {
    this.spell.set({
      cast: 0
    }, {merge: true})
  }

  _prepareSpell (prepared) {
    this.spell.set({prepared}, {merge: true})
  }

  higherLevel () {
    if (!this.props.spell.higher_level) {
      return
    }

    return (
      <View>
        <BaseText style={styles.bold}>Higher Level</BaseText>
        <Quote>
          <HTMLView
            value={this.props.spell.higher_level}
          />
        </Quote>
      </View>
    )
  }

  _onPress () {
    this.setState(prev => {
      return { showDetail: !prev.showDetail }
    })
  }
}

class SpellHeader extends React.Component {
  render () {
    return (
      <View style={styles.header}>
        <BaseText style={styles.bold}>{this.props.title}</BaseText>
        {
          this.props.slot ?
          <BaseText>Slots Used {this.slotsUsed()} / {this.props.slot.count}</BaseText> :
          null
        }
      </View>
    )
  }

  slotsUsed () {
    const spells = this.props.slot.spells
    if (!spells) {
      return
    }
    return spells.length
  }
}

class SpellList extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      slots: {}
    }
  }

  componentDidMount () {
    this.slotListeners = {}

    getCharacter().then(character => {
      this.slots = character.collection('slots')
      this.unsubscribe = this.slots.onSnapshot(snapshot => {
        this.setState(state => {
          const oldSlots = state.slots
          const slots = {}
          snapshot.forEach(slot => {
            const data = slot.data()
            data.id = slot.id
            const prevSlot = oldSlots[slot.id]
            if (prevSlot) {
              data.spells = prevSlot.spells
            }
            slots[slot.id] = data

            if (!this.slotListeners[slot.id]) {
              this.slotListeners[slot.id] = this.slots.doc(slot.id)
                .collection('spells')
                .onSnapshot(snapshot => {
                  const spells = []
                  snapshot.forEach(spell => {
                    const data = spell.data()
                    data.id = spell.id
                    spells.push(data)
                  })
                  this.setState(state => {
                    const slots = {...state.slots}
                    const s = {...slots[slot.id]}
                    s.spells = spells
                    slots[slot.id] = s
                    return {slots}
                  })
                })
            }
          })
          return {slots}
        })
      })
    })
  }

  componentWillUnmount () {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    Object.values(this.slotListeners).forEach(unsubscribe => {
      unsubscribe()
    })
    this.slotListeners = {}
  }

  render () {
    return (
      <SectionList
        sections={this.groupSpells(this.props.spells)}
        keyExtractor={this.spellExtractor}
        renderSectionHeader={({section}) => (
          <SpellHeader
            title={section.title}
            slot={section.slot}
          />
        )}
        renderItem={({item}) => <SpellItem
          navigator={this.props.navigator}
          slots={this.state.slots}
          spell={item}
        />}
      />
    )
  }

  groupSpells (spells) {
    const sections = {}
    spells.forEach(spell => {
      sections[spell.level] = (sections[spell.level] || []).concat(spell)
    })

    return Object.keys(sections).sort((a, b) => {
      if (a === 'Cantrip') {
        return -1
      }
      if (b === 'Cantrip') {
        return 1
      }
      return a < b ? -1 : 1
    }).map(section => {
      return {
        title: section,
        data: sections[section],
        slot: this.getSlot(section)
      }
    })
  }

  getSlot (section) {
    const n = parseInt(section)
    if (!n) {
      return
    }
    return this.state.slots[n]
  }

  spellExtractor (spell) {
    return spell.name
  }
}

export class KnownSpellsScreen extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      spells: [],
      spellData: {}
    }

    this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent.bind(this))
  }

  onNavigatorEvent (event) {
    if (event.type === 'NavBarButtonPress') {
      if (event.id === 'slots') {
        this.props.navigator.push({
          screen: 'dnd.SlotsScreen',
          title: 'Slots'
        })
      } else if (event.id === 'filter') {
      } else if (event.id === 'resetSlots') {
        this._resetSlots()
      } else if (event.id === 'add') {
        this.props.navigator.push({
          screen: 'dnd.AddSpellScreen',
          title: 'Add Spell'
        })
      }
    }
  }

  _resetSlots () {
    Alert.alert(
      'Reset Spell Slots?',
      'This sets all spell slot counters to zero.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset',
          onPress: () => {
            getCharacter().then(character => {
              const slots = character.collection('slots')
              const promises = []
              for (let i = 1; i < numSlotLevels; i++) {
                promises.push(slots.doc('' + i).collection('spells').get().then(spells => {
                  const promises = []
                  spells.forEach(spell => {
                    return spell.ref.delete()
                  })
                  return Promise.all(promises)
                }))
              }
              return Promise.all(promises)
            })
          },
          style: 'destructive'
        }
      ]
    )
  }

  componentDidMount () {
    getCharacter().then(character => {
      this.spells = character.collection('spells')
      this.unsubscribe = this.spells.onSnapshot(snapshot => {
        const spells = []
        const spellData = {}
        snapshot.forEach(spell => {
          const data = spell.data()
          if (!data.active) {
            return
          }
          spellData[spell.id] = data
          spells.push(spellMap[spell.id])
        })
        this.setState(state => {
          return {spells, spellData}
        })
      }) })
  }

  componentWillUnmount () {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
  }

  render () {
    return (
      <View style={styles.container}>
        {
          this.state.spells.length === 0 ?
          <View style={styles.centerp}>
            <BaseText>
              You don't have any spells. Maybe you should add some.
            </BaseText>
          </View> : null
        }

        <SpellList
          navigator={this.props.navigator}
          spells={this.state.spells}
          spellData={this.state.spellData}
        />

      </View>
    )
  }
}

export class AddSpellScreen extends React.Component {
  render () {
    return (
      <View style={styles.container}>
        <SpellList
          navigator={this.props.navigator}
          spells={spells}
        />
      </View>
    )
  }
}

export class SlotsScreen extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      slots: {}
    }
  }

  componentDidMount () {
    getCharacter().then(character => {
      this.slots = character.collection('slots')
      this.unsubscribe = this.slots.onSnapshot(snapshot => {
        const slots = {}
        snapshot.forEach(slot => {
          const data = slot.data()
          slots[slot.id] = data
        })
        this.setState(state => {
          return {slots}
        })
      })
    })
  }

  componentWillUnmount () {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
  }

  _setSlots (i, text) {
    var count = parseInt(text || 0)
    if (count < 0) {
      count = 0
    }
    this.slots.doc('' + i).set({count}, {merge: true})
    this.setState(prev => {
      if (!prev.slots[i]) {
        prev.slots[i] = {}
      }
      prev.slots[i].count = count
      return {
        slots: prev.slots
      }
    })
  }

  render () {
    const slots = []
    for (let i = 1; i <= numSlotLevels; i++) {
      slots.push(<View key={i}>
        <BaseText>Level {i}</BaseText>
        <TextInput
          value={'' + (this.state.slots[i] || {count: 0}).count}
          onChangeText={text => this._setSlots(i, text)}
          keyboardType={'numeric'}
        />
      </View>)
    }
    return (
      <ScrollView style={styles.padding}>
        {slots}
      </ScrollView>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  item: {
    flex: 1,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  narrowrow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start'
  },
  right: {
    alignItems: 'flex-end'
  },
  detail: {
    marginTop: 10
  },
  grow: {
    flexGrow: 10000
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#eee',
    padding: 10,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  padding: {
    padding: 10
  },
  centerp: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1
  },
  buttonMargin: {
    marginTop: 5,
    marginBottom: 5
  }
})
