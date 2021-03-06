import React from 'react';

import LocationOn from '@material-ui/icons/LocationOn';
import CameraAlt from '@material-ui/icons/CameraAlt';
import CloudUpload from '@material-ui/icons/CloudUpload';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import Divider from '@material-ui/core/Divider';
import { withStyles } from '@material-ui/core/styles';
import './TutorialPage.scss';
import PageWrapper from './PageWrapper';

import config from '../custom/config';

const styles = theme => ({
  logo: {
    height: '80px',
    margin: theme.spacing.unit * 3
  },
  button: {
    margin: theme.spacing.unit * 1.5
  }
});

const tutorialSteps = {
  'camera': {
    photo: <CameraAlt />,
    text: config.customiseString('tutorial', 'Walk around the city and take photos')
  },
  'upload': {
    photo: <CloudUpload />,
    text: config.customiseString('tutorial', 'Write info about the photos and upload it to the cloud')
  },
  'location': {
    photo: <LocationOn />,
    text: config.customiseString('tutorial', 'View your images in our interactive map')
  }
};

class TutorialPage extends React.Component {
  render() {
    return (
      <PageWrapper handleClickButton={this.props.handleClose} hasHeader={true}>
        <List dense className={'list'}>
          { Object.values(tutorialSteps).map((value, index) => (
            <div key={index}>
              <ListItem className={'listItem'}>
                <ListItemIcon>{value.photo}</ListItemIcon>
                <ListItemText
                  primary={<div className={'title'}>Step {index + 1}</div>}
                  secondary={value.text} />
              </ListItem>
              <Divider variant='inset' />
            </div>
          ))}
        </List>
      </PageWrapper>
    );
  }
}

export default withStyles(styles)(TutorialPage);
